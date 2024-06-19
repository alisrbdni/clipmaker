class VideoLayer extends RenderedLayer {
    constructor(file) {
      super(file);
      this.frames = [];
      if (file._leave_empty) {
        return;
      }
  
      this.video = document.createElement('video');
      this.video.setAttribute('autoplay', true);
      this.video.setAttribute('loop', true);
      this.video.setAttribute('playsinline', true);
      this.video.setAttribute('muted', true);
      this.video.setAttribute('controls', true);
      backgroundElem(this.video);
  
      this.reader = new FileReader();
      this.reader.addEventListener("load", (function() {
        this.video.addEventListener('loadedmetadata', (function() {
          let width = this.video.videoWidth;
          let height = this.video.videoHeight;
          let dur = this.video.duration;
          this.total_time = dur * 1000;
          let size = fps * dur * width * height;
          if (size < max_size) {
            this.width = width;
            this.height = height;
          } else {
            let scale = size / max_size;
            this.width = Math.floor(width / scale);
            this.height = Math.floor(height / scale);
          }
          const player_ratio = this.player.width / this.player.height;
          const video_ratio = this.width / this.height;
          if (video_ratio > player_ratio) {
            let scale = video_ratio / player_ratio;
            this.height *= scale;
          } else {
            let scale = player_ratio / video_ratio;
            this.width *= scale;
          }
          this.canvas.height = this.height;
          this.canvas.width = this.width;
          this.convertToArrayBuffer();
        }).bind(this));
        this.video.src = this.reader.result;
      }).bind(this), false);
      this.reader.readAsDataURL(file);
    }
  
    async seek(t) {
      return await (new Promise((function(resolve, reject) {
        this.video.currentTime = t;
        this.video.pause();
        this.video.addEventListener('seeked', (function(ev) {
          this.drawScaled(this.video, this.ctx, true);
          this.thumb_canvas.width = this.thumb_canvas.clientWidth * dpr;
          this.thumb_canvas.height = this.thumb_canvas.clientHeight * dpr;
          this.thumb_ctx.clearRect(0, 0, this.thumb_canvas.clientWidth, this.thumb_canvas.clientHeight);
          this.thumb_ctx.scale(dpr, dpr);
          this.drawScaled(this.ctx, this.thumb_ctx);
          let frame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
          resolve(frame);
        }).bind(this), {
          once: true
        });
      }).bind(this)));
    }
  
    async convertToArrayBuffer() {
      this.video.pause();
      let d = this.video.duration;
      let name = this.name;
      for (let i = 0; i < d * fps; ++i) {
        let frame = await this.seek(i / fps);
        let sum = 0;
        for (let j = 0; j < frame.data.length; ++j) {
          sum += frame.data[j];
        }
        this.frames.push(frame);
        this.update_name((100 * i / (d * fps)).toFixed(2) + "%");
      }
      this.ready = true;
      this.video.remove();
      this.video = null;
      this.update_name(name);
    }
  
    render(ctx_out, ref_time) {
      if (!this.ready) {
        return;
      }
      let time = ref_time - this.start_time;
      let index = Math.floor(time / 1000 * fps);
      if (index < this.frames.length) {
        const frame = this.frames[index];
        this.ctx.putImageData(frame, 0, 0);
        this.drawScaled(this.ctx, ctx_out);
      }
    }
  }
  