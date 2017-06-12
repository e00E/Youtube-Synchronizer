"use strict";

// Create an enum for different messages we will be sending
let i = 0;
const create_session_message = i++;
const remove_session_message = i++;
const add_video_message = i++;
const remove_video_message = i++;
const video_offset_change_message = i++;
const video_mute_message = i++;
const pause_message = i++;
const resume_message = i++;
const seek_message = i++;
const resync_messsage = i++;


function make_create_session_message(name) {
	return {id: create_session_message, data: {name: name}}
}

function make_remove_session_message(name) {
	return {id: remove_session_message, data: {name: name}}
}

function make_add_video_message(session, video, offset=0.0, muted=false) {
	return {id: add_video_message, data: {session: session, video: video, offset: offset, muted: muted}};
}

function make_remove_video_message(session, video) {
	return {id: remove_video_message, data: {session: session, video: video}};
}

function make_video_offset_change_message(session, video, offset) {
	return {id: video_offset_change_message, data: {session: session, video: video, offset: offset}};
}

function make_video_mute_message(session, video, muted) {
	return {id: video_mute_message, data: {session: session, video: video, muted: muted}};
}

function make_pause_message(session) {
	return {id: pause_message, data: {session: session}};
}

function make_resume_message(session) {
	return {id: resume_message, data: {session: session}};
}

function make_seek_message(session, seek_time) {
	return {id: seek_message, data:{session: session, seek_time: seek_time}};
}