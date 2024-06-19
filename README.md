# clipmaker
Online Video Editor


[https://clipmaker.io](https://clipmaker.io) (empty project)


Clipmaker is a browser based video editor .

The design values simplicity and rudimentary functionality over a full feature set.

# usage

- space to pause/play
- select layers to manipulate them (click on the timeline or sidebar)
  - shift + scroll or pinch to zoom text and images
  - drag to move them
  - arrow keys to jump between keypoints
  - backspace to remove keypoints
- import
  - by dragging in videos images or audio files
  - by clicking "+ media"
  - by pasting URLs to hosted media (only some domains)
- export by clicking "export"
  - let video play to completion
  - click "download" to grab a copy (.webm)
  

# todo

- timeline
  - [ ] allow extending beyond current max time (medium)
  - [ ] split audio play head (hard)
  - [ ] splits in templates (medium)
- file management
  - [ ] error on bad type (easy)
  - [ ] animated .gif support
- editing
  - [ ] menu for advanced settings per layer (easy)
  - [ ] element selection by click (medium)
  - [ ] undo (hard)
  - [ ] face tracking (medium)
  - [ ] opacity (easy)
  - [ ] rotation (medium)
- compatibility
  - [ ] chrome export bug workaround
  - [ ] mouseover preview safari fix
  - [ ] mobile touch events (partially done)
- code
  - [ ] refactor/simplify MoveableLayer this.frames
  - [ ] make video a MoveableLayer
  - [ ] compress video frames
  - [ ] investigate memory use warning on safari
  - [ ] cache render output for thumbnails
  - [ ] move height/width setting logic out of render loop
  - [ ] improve text scaling logic (avoid font size, use ctx.scale)
