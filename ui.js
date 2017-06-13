"use strict";

const droparea_element = document.getElementById("droparea");
const videos_display_div = document.getElementById("videosdisplay");
const centered_content_div = document.getElementById("centered_content");
const user_interface = document.getElementById("user_interface");

const video_table = document.getElementById("video_table");
const session_table = document.getElementById("session_table");

// Maps video ids to youtube player objects and corresponding div elements
// TODO: use map instead of object?
// also make a constructor for these videos
let displaying_videos = {};

// We want to fit all videos in the window while keeping each video of the same size.
// To do this we assume all video's have the same aspect ratio of 16/9 and then tile the window in a way that maximizes video size.
// There might be an analytical solution instead of checking all minimal tilings...
function ui_tile() {
	const number_of_videos = Object.keys(displaying_videos).length;
	
	if(number_of_videos > 0) {
		const video_aspect_ratio = 16 / 9;
		const window_height = window.innerHeight - user_interface.clientHeight;
		// This seems to work better than window.innerWidth because it does not include a vertical scroll bar into the width
		const window_width = document.body.clientWidth;
		
		let best_video_width = 0;
		let best_video_height = 0;
		
		let best_columns = 0;
		let best_rows = 0;
		
		let i;
		// If two tilings have the same area (for example when displaying 2 16:9 videos in a full screen window on 16:9 monitor,
		// then we prefer the tiling with less rows. To change make i be the number of columns instead of rows.
		for(i = 1; i <= number_of_videos; i++) {
			const rows = i;
			const columns = Math.ceil(number_of_videos / rows);
			const effective_aspect_ratio = (window_width / columns) / (window_height / rows);
			let potential_video_width;
			let potential_video_height;
			if(effective_aspect_ratio <= video_aspect_ratio) {
				potential_video_width = window_width / columns;
				potential_video_height = potential_video_width / video_aspect_ratio;
			} else {
				potential_video_height = window_height / rows;
				potential_video_width = potential_video_height * video_aspect_ratio;
			}
			if(potential_video_width * potential_video_height > best_video_width * best_video_height) {
				best_video_width = potential_video_width;
				best_video_height = potential_video_height;
				best_columns = columns;
				best_rows = rows;
			}
		}
		
		// In addition to tiling the videos, also center the whole page by setting margins appropriately.
		// TODO: I did not find a css solution for centering everything correctly, but maybe I just need to look harder...
		
		// Set controls to have the same width as a video row
		const total_video_width = best_columns * best_video_width;
		const total_video_height = best_rows * best_video_height;
		const horizontal_margin = (window_width - total_video_width) / 2.0;
		const vertical_margin = (window_height - total_video_height) / 2.0;
		const horizontal_margin_text = horizontal_margin.toString() + "px";
		const vertical_margin_text = vertical_margin.toString() + "px";
		
		centered_content_div.style.paddingLeft = horizontal_margin_text;
		centered_content_div.style.paddingRight = horizontal_margin_text;
		centered_content_div.style.paddingTop = vertical_margin_text;
		centered_content_div.style.paddingBottom = vertical_margin_text;
		
		for (const key of Object.keys(displaying_videos)) {
			displaying_videos[key].player.setSize(best_video_width, best_video_height);
		}
	} else {
		centered_content_div.style.padding = "0px";
	}
}

window.addEventListener('resize', function(event){
	ui_tile();
});

function on_state_change(id, event) {
	const state = event.data;
	const session = sessions[active_session];
	
	// When videos are initially loaded we autoplay them to make the player start loading the video and display a frame from the video instead of a loading icon
	// then when the video has started playing we can pause it seek it back to its correct position
	if(state === 1 && displaying_videos[id].initializing) {
		displaying_videos[id].initializing = false;
		event.target.pauseVideo();
		event.target.seekTo(get_playback_position(session) + session.videos[id].offset, true);
		if(session.videos[id].muted) { displaying_videos[id].player.mute(); }
		else { displaying_videos[id].player.unMute(); }
	}
}

function ui_show_video(id, on_ready=function(){}, start=0.0) {
	if(!displaying_videos.hasOwnProperty(id)) {
		const div_element = document.createElement('div');
		div_element.id = 'ytvideo' + id;
		videos_display_div.appendChild(div_element);
		displaying_videos[id] = {
			initializing: true,
			player: new YT.Player(div_element.id, {
				width: '100',
				height: '50',
				videoId: id,
				playerVars: {
					autoplay: 1,
					controls: 2, // Dont disable so user can do manual control. If they fuck up they can resync.
					disablekb: 0, // maybe disable to use own hotkeys
					enablejsapi: 1, // TODO: for some reason it still works when set to 0
					fs: 1,
					modestbranding: 0,
					//origin: 'localhost', // TODO
					//widget_referrer
					rel: 0,
					showinfo: 1,
					start: Math.floor(start)
				},
				events: {
					'onReady': on_ready,
					// TODO: use this to handle buffering, probably by auto pausing if buffering occurs, then unpause when its over
					'onStateChange': function(event) { on_state_change(id, event); },
					//onPlaybackQualityChange
					//onPlaybackRateChange
				}
			})
		};
	}
}

function ui_hide_video(id) {
	if(displaying_videos.hasOwnProperty(id)) {
		const video = displaying_videos[id];
		video.player.destroy();
		delete displaying_videos[id];
	}
}

function ui_hide_all_videos() {
	for (const key of Object.keys(displaying_videos)) {
		ui_hide_video(key);
	}
}

function ui_pause() {
	for (const key of Object.keys(displaying_videos)) {
		displaying_videos[key].player.pauseVideo();
	}
}

function ui_resume() {
	for (const key of Object.keys(displaying_videos)) {
		displaying_videos[key].player.playVideo();
	}
}

function ui_seek(time) {
	const session = sessions[active_session];
	for (const key of Object.keys(displaying_videos)) {
		const video = displaying_videos[key];
		const target_time = time + session.videos[key].offset;
		video.player.seekTo(target_time, true);
	}
}

function ui_join_session_click(event) {
	resync();
	join_session(this.parentNode.parentNode.dataset.session);
}

function ui_remove_session_click(event) {
	const name = this.parentNode.parentNode.dataset.session;
	const message = make_remove_session_message(name);
	channel.postMessage(message);
	handle_remove_session_message(message.data);
	write_storage();
}


function ui_add_session(name) {	
	const row = session_table.insertRow(-1);
	row.setAttribute("data-session", name);

	let cell = row.insertCell(-1);
	let element = document.createElement("input");
	element.setAttribute("type", "radio");
	element.setAttribute("name", "session");
	element.classList.add("session_radio_button");
	element.onclick = ui_join_session_click;
	cell.appendChild(element);
	
	cell = row.insertCell(-1);
	cell.appendChild(document.createTextNode(name));
	// TODO: how to style the text, need to wrap it in span I think
	
	cell = row.insertCell(-1);
	element = document.createElement("button");
	element.setAttribute("type", "button");
	element.classList.add("delete_session_button");
	element.textContent = "X";
	element.onclick = ui_remove_session_click;
	cell.appendChild(element);
}

function ui_remove_session(name) {
	const rows = session_table.rows;
	for(let i = 0; i < rows.length; ++i) {
		const row = rows[i];
		if(row.dataset.session === name) {
			session_table.deleteRow(i);
		}
	}
}

function ui_change_active_session(name) {
	const rows = session_table.rows;
	for(let i = 0; i < rows.length; ++i) {
		const row = rows[i];
		if(row.dataset.session === name) {
			row.classList.add("active_session");
			row.childNodes[0].childNodes[0].checked = true;
		}else {
			row.classList.remove("active_session");
		}
	}
};

function ui_video_visibility_click(event) {
	const video = this.parentNode.parentNode.dataset.video;
	if(this.checked) {
		this.parentNode.parentNode.classList.add("active_video");
		show_video(video);
	} else {
		this.parentNode.parentNode.classList.remove("active_video");
		ui_hide_video(video);
	}
	ui_tile();
}

function ui_remove_video_click(event) {
	const id = this.parentNode.parentNode.dataset.video;
	const message = make_remove_video_message(active_session, id);
	channel.postMessage(message);
	handle_remove_video_message(message.data);
	write_storage();
}

function ui_video_offset_change(event) {
	const number = parse_time(this.value);
	if(!(number === null || number === undefined)) {
		const id = this.parentNode.parentNode.dataset.video;
		const message = make_video_offset_change_message(active_session, id, number);
		channel.postMessage(message);
		handle_video_offset_change_message(message.data);
		write_storage();
	}
}

function ui_video_offset_change_remote(id, offset) {
	const rows = video_table.rows;
	for(let i = 0; i < rows.length; ++i) {
		const row = rows[i];
		if(row.dataset.video === id) {
			row.childNodes[2].childNodes[0].value = offset.toString();
		}
	}
}

function ui_video_mute_remote(id, muted) {
	if(displaying_videos.hasOwnProperty(id)) {
		if(muted) { displaying_videos[id].player.mute(); }
		else { displaying_videos[id].player.unMute(); }
	}
}

function ui_add_video(name) {	
	const row = video_table.insertRow(-1);
	row.setAttribute("data-video", name);

	let cell = row.insertCell(-1);
	let element = document.createElement("input");
	element.setAttribute("type", "checkbox");
	element.setAttribute("name", "video");
	element.classList.add("video_visibility_checkbox");
	element.onclick = ui_video_visibility_click;
	cell.appendChild(element);
	
	cell = row.insertCell(-1);
	cell.appendChild(document.createTextNode(name));
	// TODO: how to style the text, need to wrap it in span I think
	
	cell = row.insertCell(-1);
	element = document.createElement("input");
	element.setAttribute("type", "text");
	element.setAttribute("name", "offset");
	element.classList.add("video_offset_text");
	element.onchange = ui_video_offset_change;
	element.value = sessions[active_session].videos[name].offset.toString();
	cell.appendChild(element);
	
	cell = row.insertCell(-1);
	element = document.createElement("button");
	element.setAttribute("type", "button");
	element.classList.add("remove_video_button");
	element.textContent = "X";
	element.onclick = ui_remove_video_click;
	cell.appendChild(element);
}

function ui_remove_video(name) {	
	const rows = video_table.rows;
	for(let i = 0; i < rows.length; ++i) {
		const row = rows[i];
		if(row.dataset.video === name) {
			video_table.deleteRow(i);
		}
	}
}

function ui_remove_all_videos() {	
	const rows = video_table.rows;
	for(let i = rows.length - 1; i >= 0; --i) {
		video_table.deleteRow(i);
	}
}

function show_video(id) {
	const session = sessions[active_session];
	const rows = video_table.rows;
	for(let i = 0; i < rows.length; ++i) {
		const row = rows[i];
		if(row.dataset.video === id) {
			row.childNodes[0].childNodes[0].checked = true;
			row.classList.add("active_video");
		}
	}
	ui_show_video(id, function(e) { e.target.mute(); }, get_playback_position(session) + session.videos[id].offset);
}

document.getElementById("add_session").onclick = function() {
	join_session(create_session());
}

document.getElementById("add_video").onclick = function() {
	const url = prompt("Enter a URL to a YouTube video:");
    if(url === null || url === "") {
        return;
    }
	const id = url_to_video_id(url);
	if(id === null) {
		return;
	};
	const session = sessions[active_session];
	// Only add videos that aren't added already
	if(!session.videos.hasOwnProperty(id)) {
		const message = make_add_video_message(active_session, id);
		channel.postMessage(message);
		handle_add_video_message(message.data);
		write_storage();
	}
}

document.getElementById("play").onclick = function() {
	const session = sessions[active_session];
	if(! session.playing) {
		const message = make_resume_message(active_session);
		channel.postMessage(message);
		handle_resume_message(message.data);
		write_storage();
	}
}

document.getElementById("pause").onclick = function() {
	const session = sessions[active_session];
	if(session.playing) {
		const message = make_pause_message(active_session);
		channel.postMessage(message);
		handle_pause_message(message.data);
		write_storage();
	}
}

const seek_time_element = document.getElementById("seek_time");
document.getElementById("seek").onclick = function() {
	const number = parse_time(seek_time_element.value);
	if(!(number === null ||number === undefined)) {
		const session = sessions[active_session];
		const message = make_seek_message(active_session, number);
		channel.postMessage(message);
		handle_seek_message(message.data);
		write_storage();
	}
}

document.getElementById("resync").onclick = function() {
	resync();
}

document.getElementById("share_link").onclick = function() {
	observe_mutes();

	const session = sessions[active_session];
	
	// Copy the current url, including its parameters
	const url = new URL(window.location.href);
	const params = url.searchParams;
	
	// Delete existing videos
	params.delete("v");
	params.delete("t");
	params.delete("m");
	
	// Add new videos
	for (const key of Object.keys(session.videos)) {
		const video = session.videos[key];
		params.append("v", key);
		params.append("t", video.offset);
		if(video.muted) { params.append("m", "t"); }
	}
	
	// https://stackoverflow.com/a/6055620
	window.prompt("Copy to clipboard: Ctrl+C, Enter", url.toString());
}

// Parse offset or seek time from string to seconds as float
// Can have two formats: Either just a floating point number as seconds
// or HOURS:MM:SECONDS where are hours and minutes are integers and seconds is a float
function parse_time(input) {
	if(input.includes(":")) {
		const parts = input.split(":");
		if(parts.length === 3) {
			const hours = parseInt(parts[0]);
			const minutes = parseInt(parts[1]);
			let seconds = parseFloat(parts[2]);
			if(! (isNaN(hours) || isNaN(minutes) || isNaN(seconds))) {
				seconds = hours * 60 * 60 + minutes * 60 + seconds;
				if(seconds >= 0.0) { return seconds; }
			}
		}
	} else {
		const seconds = parseFloat(input);
		if(! isNaN(seconds) && seconds >= 0.0) {
			return seconds;
		}
	}
}

let ui_is_hidden = false;
let draggable_controls_container_is_hidden = true;
const draggable_controls_fixed = document.getElementById("draggable_controls_fixed");
const other_controls = document.getElementById("other_controls");
const toggle_ui = document.getElementById("toggle_ui");
toggle_ui.onclick = function() {
	if(ui_is_hidden) { show_ui(); }
	else { hide_ui(); }
};

function show_ui() {
	draggable_controls.parentNode.removeChild(draggable_controls);
	draggable_controls_fixed.appendChild(draggable_controls);
	toggle_ui.parentNode.removeChild(toggle_ui);
	other_controls.appendChild(toggle_ui);
	toggle_ui.textContent = "hide UI";
	user_interface.style.display = "block";
	ui_is_hidden = false;
	ui_tile();
}

function hide_ui() {
	user_interface.style.display = "none";
	ui_is_hidden = true;
	ui_tile();
	toggle_ui.parentNode.removeChild(toggle_ui);
	toggle_ui.textContent = "show UI";
	draggable_controls.appendChild(toggle_ui);
	draggable_controls.parentNode.removeChild(draggable_controls);
	draggable_controls_container.appendChild(draggable_controls);
}

function show_draggable_controls_container() {
	if(draggable_timer !== null) { window.clearTimeout(draggable_timer); }
	draggable_controls_container.style.display = "";
	draggable_controls_container_is_hidden = false;
	fade_out_draggable_controls_container();
}

function hide_draggable_controls_container() {
	draggable_controls_container.style.display = "none";
	draggable_controls_container_is_hidden = true;
}

let draggable_timer = null;
function fade_out_draggable_controls_container() {
	window.clearTimeout(draggable_timer);
	draggable_timer = window.setTimeout(hide_draggable_controls_container, 5000);
}

document.addEventListener("keydown", function(event) {
	switch (event.key) {
		case "h":
			event.preventDefault();
			if(ui_is_hidden) {
				show_ui();
				hide_draggable_controls_container();				
			}else {
				hide_ui();
				show_draggable_controls_container();	
			}
			break;
		case " ":
			event.preventDefault();
			const session = sessions[active_session];
			const message = session.playing ? make_pause_message(active_session) : make_resume_message(active_session);
			channel.postMessage(message);
			session.playing ? handle_pause_message(message.data) : handle_resume_message(message.data);
			write_storage();
			break;
		default:
		  return; // Quit when this doesn't handle the key event.
	}
}, false);

// Use mouse events to find out when we need to show the draggable controls
// Its For mouseout window is used because it seems to only trigger when the mouse leaves or enters an iframe
// For mouseenter document is used because it triggers when the cursor reenters the browser window.
window.addEventListener("mouseout", function(event) {
	if(ui_is_hidden && draggable_controls_container_is_hidden) {
		show_draggable_controls_container();
	}
});
document.addEventListener("mouseenter", function(event) {
	if(ui_is_hidden && draggable_controls_container_is_hidden) {
		show_draggable_controls_container();
	}
});
// This does not trigger if the mouse is moved while inside an iframe
window.addEventListener("mousemove", function(event) {
	if(ui_is_hidden && draggable_controls_container_is_hidden) {
		show_draggable_controls_container();
	}
});

// https://stackoverflow.com/a/6239882
// Make playback controls draggable
function drag_start(event) {
	drag_helper.style.display = "";
    const style = window.getComputedStyle(event.target, null);
    event.dataTransfer.setData("text/plain",
    (parseInt(style.getPropertyValue("left"),10) - event.clientX) + "," + (parseInt(style.getPropertyValue("top"),10) - event.clientY));
}
function drop(event) {
	drag_helper.style.display = "none";
    const offset = event.dataTransfer.getData("text/plain").split(',');
    draggable_controls_container.style.left = (event.clientX + parseInt(offset[0],10)) + "px";
    draggable_controls_container.style.top = (event.clientY + parseInt(offset[1],10)) + "px";
    event.preventDefault();
    return false;
}
function drag_over(event) {
    event.preventDefault();
    return false;
}
const draggable_controls_container = document.getElementById("draggable_controls_container");
const draggable_controls = document.getElementById("draggable_controls");
const drag_helper = document.getElementById("drag_helper");
draggable_controls_container.addEventListener('dragstart',drag_start,false);
document.body.addEventListener('dragover',drag_over,false);
document.body.addEventListener('drop',drop,false);

let mute_observer = null;
function observe_mutes() {
	const session = sessions[active_session];
	for (const key of Object.keys(displaying_videos)) {
		const video = displaying_videos[key];
		if(!video.initializing) {
			const muted = video.player.isMuted();
			if(muted !== session.videos[key].muted) {
				const message = make_video_mute_message(active_session, key, muted);
				channel.postMessage(message);
				handle_video_mute_message(message.data);
				write_storage();
			}
		}
	}
}

function ui_init() {
	// There is no mute event in the youtube player api so we need to manually check if mute state changed
	mute_observer = window.setInterval(observe_mutes, 10000);
}

window.onbeforeunload = function(e) {
  resync();
};