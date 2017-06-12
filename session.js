"use strict";

function Video(offset=0.0, muted=false) {
	// Positive float specifying what number to add to the current abstract playback position to get this video's playback position. So a value of 1.0 means this video starts 1 second earlier than the others.
	// In other words it is the starting position of each video.
	this.offset = offset;
	this.muted = muted;
}

function Session() {
	// Would like to use Map here but it doesnt get converted to json by JSON.stringify
	// dictionary mapping string (video_id) to video object
	this.videos = {};
	// is this session paused or playing
	this.playing = false;
	// if paused this is the time in seconds (float) where the master video is at, if unpaused it is the position the video was unpaused from
	this.last_position = 0;
	// epoch in milliseconds at which the session last started playing. 
	this.last_play_time = 0;
	// Last_position and last_play time can be used to calculate the current playback position.
}

// Compute the current playpback position of a session
function get_playback_position(session) {
	if(session.playing) {
		const now = (new Date()).getTime();
		const time_playing = now - session.last_play_time;
		return session.last_position + time_playing / 1000.0;
	} else {
		return session.last_position;
	}
}