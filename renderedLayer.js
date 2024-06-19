class RenderedLayer {
    constructor(file) {
      this.name = file.name;
      if (file.uri) {
        this.uri = file.uri;
      }
      this.ready = false;
  
      this.total_time = 0;
      this.start_time = 0;
  
      this.width = 0;
      this.height = 0;
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      backgroundElem(this.canvas);
    }
  
    dump() {
      return {
        width: this.width,
        height: this.height,
        name: this.name,
        start_time: this.start_time,
        total_time: this.total_time,
        uri: this.uri,
        type: this.constructor.name
      };
    }
  
    resize() {
      this.thumb_canvas.width = this.thumb_canvas.clientWidth * dpr;
      this.thumb_canvas.height = this.thumb_canvas.clientHeight * dpr;
      this.thumb_ctx.scale(dpr, dpr);
    }
  
    show_preview(ref_time) {
      if (!this.ready) {
        return;
      }
      this.thumb_ctx.clearRect(0, 0, this.thumb_canvas.clientWidth, this.thumb_canvas.clientHeight);
      this.render(this.thumb_ctx, ref_time);
    }
  
    update_name(name) {
      this.name = name;
      this.description.textContent = "\"" + this.name + "\"";
    }
  
    init(player, preview) {
      this.player = player;
      this.preview = preview;
      this.canvas.width = this.player.width;
      this.canvas.height = this.player.height;
      this.title_div = this.preview.querySelector('.preview_title');
  
      this.description = document.createElement('span');
      this.description.classList.toggle('description');
      this.description.addEventListener('click', (function(e) {
        const new_text = prompt("enter new text");
        if (new_text) {
          this.update_name(new_text);
        }
      }).bind(this));
      this.title_div.appendChild(this.description);
  
      let delete_option = document.createElement('a');
      delete_option.textContent = '[x]';
      delete_option.style.float = "right";
      delete_option.addEventListener('click', (function() {
        if (confirm("delete layer \"" + this.name + "\"?")) {
          this.player.remove(this);
        }
      }).bind(this));
      this.title_div.appendChild(delete_option);
  
      this.thumb_canvas = this.preview.querySelector('.preview_thumb');
      this.thumb_ctx = this.thumb_canvas.getContext('2d');
      this.thumb_ctx.scale(dpr, dpr);
      this.update_name(this.name);
    }
  
    render_time(ctx, y_coord, width, selected) {
      let scale = ctx.canvas.clientWidth / this.player.total_time;
      let start = scale * this.start_time;
      let length = scale * this.total_time;
      if (selected) {
        ctx.fillStyle = `rgb(210,210,210)`;
      } else {
        ctx.fillStyle = `rgb(110,110,110)`;
      }
      ctx.fillRect(start, y_coord - width / 2, length, width);
      let end_width = width * 6;
      let tab_width = 2;
      ctx.fillRect(start, y_coord - end_width / 2, tab_width, end_width);
      ctx.fillRect(start + length - tab_width / 2, y_coord - end_width / 2, tab_width, end_width);
    }
  
    update(change, time) {
      return;
    }
  
    drawScaled(ctx, ctx_out, video = false) {
      const width = video ? ctx.videoWidth : ctx.canvas.clientWidth;
      const height = video ? ctx.videoHeight : ctx.canvas.clientHeight;
      const in_ratio = width / height;
      const out_ratio = ctx_out.canvas.clientWidth / ctx_out.canvas.clientHeight;
      let ratio = 1;
      let offset_width = 0;
      let offset_height = 0;
      if (in_ratio > out_ratio) {
        ratio = ctx_out.canvas.clientWidth / width;
        offset_height = (ctx_out.canvas.clientHeight - (ratio * height)) / 2;
      } else {
        ratio = ctx_out.canvas.clientHeight / height;
        offset_width = (ctx_out.canvas.clientWidth - (ratio * width)) / 2;
      }
      ctx_out.drawImage((video ? ctx : ctx.canvas),
        0, 0, width, height,
        offset_width, offset_height, ratio * width, ratio * height);
    }
  }
  