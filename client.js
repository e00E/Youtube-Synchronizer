"use strict";

// Communication channel between tabs
// Used to send state updates initiated in one tab to the others
const channel = new BroadcastChannel("all");

// Retrieve existing sessions from localStorage
let sessions = localStorage.getItem("sessions");
if(sessions === null) {
  sessions = {};
} else {
	sessions = JSON.parse(sessions);
}

// There always has to be an active session
// We set this for the first time inthe init function
let active_session = null;


function join_any_session() {
	for (const key of Object.keys(sessions)) {
		join_session(key);
		return true;
	}
	return false;
}

function init() {
	for (const key of Object.keys(sessions)) {
		ui_add_session(key);
	}
	
	const url = new URL(window.location.href);
	// The url parameters can contain information about a session that should automatically be created
	// Instead of creating a new session every time the site is loaded with those parameters we first look for an existing session which already matches the parameters perfectly
	// If that doesnt exist we reuse an existing but empty session
	// And only if that also doesnt exist we create a new session
	// This prevents many "ghost" sessions from staying around if a user for example refreshes a page loaded with parameters, or revisists the same parameter url multiple times
	if(url.searchParams.get("v") !== null) {
		let videos = {};

		// Parse all videos from the url
		let last_video = null;
		for(const i of url.searchParams.entries()) {
			const key = i[0];
			const value = i[1];
			switch(key) {
				case "v": {
					videos[value] = new Video();
					last_video = value;
					break; }
				case "t": {
					const offset = parseFloat(value);
					if(!isNaN(offset) && offset >= 0.0) {
						videos[last_video].offset = offset;
					}
					break; }
				case "m": {
					videos[last_video].muted = value === "t";
					break; }
			}
		}
		
		// Try to find an existing session with exactly those videos and offsets
		session_loop:
		for(const key of Object.keys(sessions)) {
			const session = sessions[key];
			for(const key of Object.keys(videos)) {
				const video1 = session.videos[key];
				const video2 = videos[key];
				if(!(session.videos.hasOwnProperty(key) && video1.offset === video2.offset && video1.muted === video2.muted)) {
					continue session_loop;
				}
			}
			join_session(key);
			return;
		}
		
		let session = null;
		// Try to find an existing session with no videos
		for(const key of Object.keys(sessions)) {
			if(Object.keys(sessions[key].videos).length === 0) {
				session = key;
				break;
			}
		}
		
		// Finally create a new session and add the url parameter videos
		if(session === null) {
			session = create_session();
		}
		
		for(const key of Object.keys(videos)) {
			const video = videos[key];
			const message = make_add_video_message(session, key, video.offset, video.muted);
			channel.postMessage(message);
			handle_add_video_message(message.data);
		}
		write_storage();
		
		join_session(session);
	} else { // If we dont have videos in url parameters we can join any session
		if(! join_any_session()) {
			create_session("initial");
			join_session("initial");
		}
	}
	
}

// Event handling functions

function handle_create_session_message(data) {
	// Need to explicitly check for nonexisting session here because if one tab deletes the active session of itself and another tab then
	// both tabs will create a new sesssion at the same time
	if(!sessions.hasOwnProperty(data.name)) {
		sessions[data.name] = new Session();
		// Automatically join new sessions if we have no active one
		ui_add_session(data.name);
		if(active_session === null) {
			join_session(data.name);
		}
	}
}

function handle_remove_session_message(data) {
	ui_remove_session(data.name);
	if(active_session === data.name) {
		ui_hide_all_videos();
		delete sessions[data.name];
		if(! join_any_session()) {
			create_session("initial");
			join_session("initial");
		}	
	} else {
		delete sessions[data.name];
	}
}

function handle_add_video_message(data) {
	const session = sessions[data.session];
	session.videos[data.video] = new Video();
	session.videos[data.video].offset = data.offset;
	session.videos[data.video].muted = data.muted;
	if(data.session === active_session) {
		ui_add_video(data.video);
		show_video(data.video);
		ui_tile();
	}
}

function handle_remove_video_message(data) {
	const session = sessions[data.session];
	delete session.videos[data.video];
	if(data.session === active_session) {
		ui_hide_video(data.video);
		ui_remove_video(data.video);
		ui_tile();
	}
}

function handle_video_offset_change_message(data) {
	const session = sessions[data.session];
	session.videos[data.video].offset = data.offset;
	if(data.session === active_session) {
		ui_video_offset_change_remote();
		resync();
	}
}

function handle_video_mute_message(data) {
	const session = sessions[data.session];
	session.videos[data.video].muted = data.muted;
	if(data.session === active_session) {
		ui_video_mute_remote(data.video, data.muted);
	}
}

function handle_pause_message(data) {
	const session = sessions[data.session];
	if(session.playing) {                        
		session.playing = false;
		// calculate how much session played since it started playing
		const current_time = (new Date()).getTime();
		session.last_position += (current_time - session.last_play_time) / 1000.0;
		if(data.session === active_session) {
			ui_pause();
		}
	}
}

function handle_resume_message(data) {
	const session = sessions[data.session];
	if(!session.playing) {
		session.playing = true;
		const current_time = (new Date()).getTime();
		session.last_play_time = current_time;
		if(data.session === active_session) {
			ui_resume();
		}
	}
}

function handle_seek_message(data) {
	const session = sessions[data.session];
	session.playing = false;
	session.last_position = data.seek_time;
	if(data.session === active_session) {
		ui_pause();
		ui_seek(data.seek_time);
	}
}

// Map of message ids to corresponding handler functions
const message_handlers = {};
message_handlers[create_session_message] = handle_create_session_message;
message_handlers[remove_session_message] = handle_remove_session_message;
message_handlers[add_video_message] = handle_add_video_message;
message_handlers[remove_video_message] = handle_remove_video_message;
message_handlers[video_offset_change_message] = handle_video_offset_change_message;
message_handlers[video_mute_message] = handle_video_mute_message;
message_handlers[pause_message] = handle_pause_message;
message_handlers[resume_message] = handle_resume_message;
message_handlers[seek_message] = handle_seek_message;

channel.onmessage = function(e) {
	const message = e.data;
	const data = message.data;
	// console.log("Incoming channel message:");
	// console.log(message);
	if(message_handlers.hasOwnProperty(message.id)) {
		message_handlers[message.id](data);
	} else {
		console.log("Error: unknown message id:", message.id);
	}
	// console.log("State now:");
	// console.log(sessions);
}

function write_storage() {
	localStorage.setItem("sessions", JSON.stringify(sessions));
}

// http://stackoverflow.com/a/19964557
const s = "abcdefghijklmnopqrstuvwxyz0123456789";
function random_string(length) {
	return Array(length).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
}

function create_session(name = null) {
	if(name === null) {
		do {
			name = random_string(5);
		} while(sessions.hasOwnProperty(name));
	} else if(sessions.hasOwnProperty(name)) {
		return null;
	}
	const message = make_create_session_message(name)
	channel.postMessage(message);
	handle_create_session_message(message.data);
	write_storage();
	return name;
}

function resync() {
	const session = sessions[active_session];
	{
	const message = make_pause_message(active_session);
	channel.postMessage(message);
	handle_pause_message(message.data);
	}
	{
	const message = make_seek_message(active_session, get_playback_position(session));
	channel.postMessage(message);
	handle_seek_message(message.data);
	write_storage();
	}
}

function join_session(name) {
	if(sessions.hasOwnProperty(name)) {
		ui_hide_all_videos();
		ui_remove_all_videos();
		active_session = name;
		ui_change_active_session(active_session);
		const session = sessions[active_session];
		resync();
		const position = get_playback_position(session);
		for (const key of Object.keys(session.videos)) {
			ui_add_video(key);
			show_video(key);
		}
		ui_tile();
	}
}

function onYouTubeIframeAPIReady() {
	ui_init();
	init();
}