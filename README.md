# Youtube-Synchronizer
Live version here: https://e00e.github.io/Youtube-Synchronizer/

The goal of this website is to synchronize playback of multiple youtube videos. It was inspired by [viewsync](https://viewsync.net/) but has the additional feature of working in multiple tabs. This means you can synchronize playback of two videos playing in two browser windows which allows you to fullscreen both on two monitors.

Here are some example links to get the gist of it:
* https://e00e.github.io/Youtube-Synchronizer/index.html?v=5A9Eh6D-K_g&t=0.425&m=t&v=UkgK8eUdpAo&t=0
* https://e00e.github.io/Youtube-Synchronizer/index.html?v=dTAAsCNK7RA&t=5&v=gq7r3F1SoX0&t=6.41&m=t
* https://e00e.github.io/Youtube-Synchronizer/index.html?v=qj8s89PE180&t=191&m=t&v=wLCFsXMOBy0&t=974&m=t&v=iiLqi4Op0hs&t=114

Try visiting the site from multiple browser windows.

The implementation is in javascript and uses no external libraries except for the [youtube iframe api](https://developers.google.com/youtube/iframe_api_reference). It is fully functional but its user inteface could be made to look much nicer and some quality of life features might be missing.

A lot of modern html and javascript features are used which probably only work in recent versions of Chrome and Firefox. More specifically persistance is achieved with [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Storage) and communication between tabs with [BroadcastChannels](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel).

I apologize for the scraggy javascript and I should probably minify everything for production use.
