"use strict";

// Try to parse a video id from a youtube url
const parser = document.createElement('a');
function url_to_video_id(url) {
	url = url.trim();
	const parser = new URL(url);
	if(["www.youtube.com", "youtube.com"].includes(parser.hostname)) {
		const params = parser.searchParams;
		const video = params.get("v");
		return video;
	} else if(["www.youtu.be", "youtu.be"].includes(parser.hostname)) {
		return parser.pathname.substr(1, parser.pathname.length-1);
	} else {
		return null;
	}
}