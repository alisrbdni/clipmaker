class Player {
    constructor() {
      this.playing = false;
      this.scrubbing = false;
      this.layers = [];
      this.selected_layer = null;
      this.onend_callback = null;
      this.update = null;
      this.width = 1280;
      this.height = 720;
      this.total_time = 0;
      this.last_step = null;
      this.time = 0;
      this.last_paused = Number.MAX_SAFE_INTEGER;
      this.aux_time = 0;
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.audio_ctx = new AudioContext();
      this.canvas_holder = document.getElementById('canvas');
      this.canvas_holder.appendChild(this.canvas);
      this.time_scale = 1.0;
      this.time_holder = document.getElementById('time');
      this.time_canvas = document.createElement('canvas');
      this.time_canvas.addEventListener('pointerdown', this.scrubStart.bind(this));
      this.time_canvas.addEventListener('pointermove', this.scrubMove.bind(this), {passive: false});
      this.time_canvas.addEventListener('pointerleave', this.scrubEnd.bind(this));
      this.time_ctx = this.time_canvas.getContext('2d');
      this.time_holder.appendChild(this.time_canvas);
      this.cursor_preview = document.getElementById('cursor_preview');
      this.cursor_canvas = this.cursor_preview.querySelector('canvas');
      this.cursor_ctx = this.cursor_canvas.getContext('2d');
      this.cursor_text = this.cursor_preview.querySelector('div');
      window.requestAnimationFrame(this.loop.bind(this));
  
      this.setupPinchHadler(this.canvas_holder, (function(scale, rotation) {
        this.update = {scale: scale, rotation: rotation};
      }).bind(this));
      this.setupPinchHadler(this.time_holder, (function(scale, rotation) {
        let new_x = (this.time_holder.clientWidth * scale - this.time_holder.clientWidth);
        let old_x = this.time_holder.scrollLeft;
        this.time_scale = Math.max(1, this.time_scale * scale);
        this.resize_time();
        this.time_holder.scroll(Math.round(old_x + new_x), 0);
      }).bind(this));
      this.setupDragHandler();
      this.resize();
    }
  
    dumpToJson() {
      let out = [];
      for (let layer of this.layers) {
        out.push(layer.dump());
      }
      return JSON.stringify(out);
    }
  
    async loadLayers(layers) {
      let on_ready = function(d, c) {
        if (!d.ready) {
          setTimeout(function(){ on_ready(d, c); }, 10);
        } else {
          c(d);
        }
      };
      for (let layer_d of layers) {
        let layer = null;
        if (layer_d.type == "VideoLayer") {
          layer = await this.addURI(layer_d.uri);
        } else if (layer_d.type == "TextLayer") {
          layer = this.add(new TextLayer(layer_d.name));
        } else if (layer_d.type == "ImageLayer") {
          layer = await this.addURI(layer_d.uri);
        }
        if (!layer) {
          alert("layer couldn't be processed");
          continue;
        }
        on_ready(layer, function(l) {
          layer.name = layer.name;
          layer.width = layer_d.width,
          layer.height = layer_d.height,
          layer.start_time = layer_d.start_time;
          layer.total_time = layer_d.total_time;
          if (layer_d.frames) {
            layer.frames = [];
            for (let f of layer_d.frames) {
              layer.frames.push(new Float32Array(f));
            }
          }
        });
      }
    }
  
    intersectsTime(time, query) {
      if (!query) {
        query = this.time;
      }
      return Math.abs(query - time) / this.total_time < 0.01;
    }
  
    refresh_audio() {
      for (let layer of this.layers) {
        if (layer instanceof AudioLayer) {
          layer.init_audio(this.time);
        }
      }
    }
  
    play() {
      this.playing = true;
      if (this.last_paused != this.time) {
        this.refresh_audio();
      }
      this.audio_ctx.resume();
    }
  
    pause() {
      this.playing = false;
      this.audio_ctx.suspend();
      this.last_paused = this.time;
    }
  
    scrubStart(ev) {
      this.scrubbing = true;
      let rect = this.time_canvas.getBoundingClientRect();
      this.time = ev.offsetX / rect.width * this.total_time;
  
      window.addEventListener('pointerup', this.scrubEnd.bind(this), {once: true});
  
      let y_inc = this.time_canvas.clientHeight / (this.layers.length + 1);
      let y_coord = this.time_canvas.clientHeight;
      let mouseover = false;
      for (let layer of this.layers) {
        y_coord -= y_inc;
        if (layer.start_time > (1.01 * this.time)) {
          continue;
        }
        if (layer.start_time + layer.total_time < (0.99 * this.time)) {
          continue;
        }
        if (Math.abs(ev.offsetY - y_coord) < (0.05 * this.time_canvas.clientHeight)) {
          this.select(layer);
          mouseover = true;
        }
      }
  
      if (!this.selected_layer || !mouseover) {
        return;
      }
  
      let l = this.selected_layer;
  
      if (this.intersectsTime(l.start_time)) {
        this.time = l.start_time;
        let base_t = this.time;
        this.dragging = function(t) {
          let diff = t - base_t;
          base_t = t;
          l.start_time += diff;
        }
      } else if (this.intersectsTime(l.start_time + l.total_time)) {
        this.time = l.start_time + l.total_time;
        let base_t = this.time;
        this.dragging = function(t) {
          let diff = t - base_t;
          base_t = t;
          if (l instanceof MoveableLayer) {
            l.adjustTotalTime(diff);
          } else {
            l.start_time += diff;
          }
        }
      } else if (this.time < l.start_time + l.total_time && this.time > l.start_time) {
        let base_t = this.time;
        this.dragging = function(t) {
          let diff = t - base_t;
          base_t = t;
          l.start_time += diff;
        }
      }
    }
  
    scrubMove(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      let rect = this.time_canvas.getBoundingClientRect();
      let time = ev.offsetX / rect.width * this.total_time;
  
      document.body.style.cursor = "default";
  
      if (this.selected_layer) {
        let l = this.selected_layer;
        if (this.intersectsTime(l.start_time, time)) {
          document.body.style.cursor = "col-resize";
        }
        if (this.intersectsTime(l.start_time + l.total_time, time)) {
          document.body.style.cursor = "col-resize";
        }
      }
  
      this.cursor_preview.style.display = "block";
      let cursor_x = Math.max(ev.clientX - this.cursor_canvas.clientWidth / 2, 0);
      cursor_x = Math.min(cursor_x, rect.width - this.cursor_canvas.clientWidth);
      this.cursor_preview.style.left = cursor_x + "px";
      this.cursor_preview.style.bottom = (rect.height) + "px";
  
      this.aux_time = time;
      this.cursor_text.textContent = this.aux_time.toFixed(2) + "/" + this.total_time.toFixed(2)
  
      if (this.scrubbing) {
        this.time = time;
      }
  
      if (this.dragging) {
        this.dragging(this.time);
      }
    }
  
    scrubEnd(ev) {
      document.body.style.cursor = "default";
      this.cursor_preview.style.display = "none";
      this.scrubbing = false;
      this.dragging = null;
      this.total_time = 0;
      this.aux_time = 0;
    }
  
    setupPinchHadler(elem, callback) {
      let gestureStartRotation = 0;
      let gestureStartScale = 0;
  
      let wheel = function(e) {
        if (e.ctrlKey || e.shiftKey) {
          e.preventDefault();
          let delta = e.deltaY;
          if (!Math.abs(delta) && e.deltaX != 0) {
            delta = e.deltaX * 0.5;
          }
          let scale = 1;
          scale -= delta * 0.01;
          callback(scale, 0);
        } else if (e.altKey) {
          let delta = e.deltaY;
          if (!Math.abs(delta) && e.deltaX != 0) {
            delta = e.deltaX * 0.5;
          }
          let rot = -delta * 0.1;
          callback(0, rot);
        }
      }
  
      let gesturestart = function(e) {
        this.gesturing = true;
        e.preventDefault();
        gestureStartRotation = e.rotation;
        gestureStartScale = e.scale;
      };
      let gesturechange = function(e) {
        e.preventDefault();
        e.stopPropagation();
        let rotation = e.rotation - gestureStartRotation;
        let scale = e.scale / gestureStartScale;
        gestureStartRotation = e.rotation;
        gestureStartScale = e.scale;
        callback(scale, rotation);
      };
      let gestureend = function(e) {
        this.gesturing = false;
        e.preventDefault();
      };
      elem.addEventListener('gesturestart', gesturestart.bind(this));
      elem.addEventListener('gesturechange', gesturechange.bind(this));
      elem.addEventListener('gestureend', gestureend.bind(this));
      elem.addEventListener('wheel', wheel.bind(this), {passive: false});
      let deleter = function() {
        elem.removeEventListener('gesturestart', gesturestart);
        elem.removeEventListener('gesturechange', gesturechange);
        elem.removeEventListener('gestureend', gestureend);
        elem.removeEventListener('wheel', wheel);
      }
    }
  
    setupDragHandler() {
      let callback = (function(x, y) {
        this.update = {x: x, y: y};
      }).bind(this);
      let elem = this.canvas_holder;
      let dragging = false;
      let base_x = 0;
      let base_y = 0;
      let pointerup = function(e) {
        dragging = false;
        e.preventDefault();
      }
      let get_ratio = (function(elem) {
        let c_ratio = elem.clientWidth / elem.clientHeight;
        let target_ratio = this.width / this.height;
        let ratio = 1;
        if (c_ratio > target_ratio) {
          ratio = this.height / elem.clientHeight;
        } else {
          ratio = this.width / elem.clientWidth;
        }
        return ratio;
      }).bind(this);
      let pointerdown = function(e) {
        if (!this.selected_layer) {
          return;
        }
        if (!(this.selected_layer instanceof MoveableLayer)) {
          return;
        }
        e.preventDefault();
        let f = this.selected_layer.getFrame(this.time);
        if (!f) {
          return;
        }
        dragging = true;
        base_x = e.offsetX * get_ratio(e.target) - f[0];
        base_y = e.offsetY * get_ratio(e.target) - f[1];
        window.addEventListener('pointerup', pointerup, {once: true});
      }
      let pointermove = function(e) {
        if (this.gesturing) { return; }
        e.preventDefault(); 
        e.stopPropagation();
        if (dragging) {
          let dx = e.offsetX * get_ratio(e.target) - base_x;
          let dy = e.offsetY * get_ratio(e.target) - base_y;
          callback(dx, dy);
        }
      }
      elem.addEventListener('pointerdown', pointerdown.bind(this));
      elem.addEventListener('pointermove', pointermove.bind(this), {passive: false});
      let deleter = function() {
        elem.removeEventListener('pointerdown', pointerdown);
        elem.removeEventListener('pointermove', pointermove);
      }
    }
  
    prev() {
      if (this.selected_layer) {
        let l = this.selected_layer;
        if (l instanceof MoveableLayer) {
          let i = l.nearest_anchor(this.time, false);
          if (i >= 0) {
            this.time = l.getTime(i);
            return;
          }
        }
      }
      this.time = Math.max(this.time - 100, 0);
    }
  
    next() {
      if (this.selected_layer) {
        let l = this.selected_layer;
        if (l instanceof MoveableLayer) {
          let i = l.nearest_anchor(this.time, true);
          if (i >= 0) {
            this.time = l.getTime(i);
            return;
          }
        }
      }
      this.time = Math.min(this.time + 100, this.total_time - 1);
    }
  
    delete_anchor() {
      if (this.selected_layer) {
        let l = this.selected_layer;
        if (l instanceof MoveableLayer) {
          l.delete_anchor(this.time);
          this.prev();
        }
      }
    }
  
    deselect() {
      if (this.selected_layer !== null) {
        this.selected_layer.preview.classList.toggle('selected');
      }
    }
  
    select(layer) {
      this.deselect();
      this.selected_layer = layer;
      this.selected_layer.preview.classList.toggle('selected');
    }
  
    remove(layer) {
      const idx = this.layers.indexOf(layer);
      const len = this.layers.length;
      if (idx > -1) {
        this.layers.splice(idx, 1);
        let layer_picker = document.getElementById('layers');
        layer_picker.children[len - idx - 1].remove();
      }
      if (layer instanceof AudioLayer) {
        layer.disconnect();
      }
      this.total_time = 0;
      for (let layer of this.layers) {
        if (layer.start_time + layer.total_time > this.total_time) {
          this.total_time = layer.start_time + layer.total_time;
        }
      }
      if (this.time > this.total_time) {
        this.time = this.total_time;
      }
    }
  
    add(layer) {
      let layer_picker = document.getElementById('layers');
      let preview = document.createElement('div');
      let thumb = document.createElement('canvas');
      let title = document.createElement('div');
      preview.classList.toggle('preview');
  
      preview.setAttribute('draggable', true);
      preview.addEventListener('dragstart', (function(ev) {
        this.preview_dragging = preview;
        this.preview_dragging_layer = layer;
      }).bind(this));
      preview.addEventListener('dragover', function(ev) {
        ev.preventDefault();
      });
      preview.addEventListener('drop', (function(ev) {
        preview.before(this.preview_dragging);
        let idx = this.layers.indexOf(this.preview_dragging_layer);
        if (idx > -1) {
          this.layers.splice(idx, 1);
        }
        let new_idx = this.layers.indexOf(layer);
        this.layers.splice(new_idx + 1, 0, this.preview_dragging_layer);
        this.select(this.preview_dragging_layer);
        this.preview_dragging = null;
        this.preview_dragging_layer = null;
      }).bind(this));
  
      preview.addEventListener('click', (function() {
        this.select(layer);
      }).bind(this));
      thumb.classList.toggle('preview_thumb');
      title.classList.toggle('preview_title');
      preview.appendChild(thumb);
      preview.appendChild(title);
      layer_picker.prepend(preview);
      layer.start_time = this.time;
      layer.init(this, preview);
      this.layers.push(layer);
      this.select(layer);
      return layer;
    }
  
    split() {
      if (!this.selected_layer) {
        return;
      }
      let l = this.selected_layer;
      if (!(l instanceof VideoLayer)) {
        return;
      }
      if (!l.ready) {
        return;
      }
      if (l.start_time > this.time) {
        return;
      }
      if (l.start_time + l.total_time < this.time) {
        return;
      }
      let nl = new VideoLayer({
        name: l.name + "NEW",
        _leave_empty: true
      });
      const pct = (this.time - l.start_time) / l.total_time;
      const split_idx = Math.round(pct * l.frames.length);
      nl.frames = l.frames.splice(0, split_idx);
      this.add(nl);
      nl.start_time = l.start_time;
      nl.total_time = pct * l.total_time;
      l.start_time = l.start_time + nl.total_time;
      l.total_time = l.total_time - nl.total_time;
      nl.width = l.width;
      nl.height = l.height;
      nl.canvas.width = l.canvas.width;
      nl.canvas.height = l.canvas.height;
      nl.resize();
      nl.ready = true;
    }
  
    onend(callback) {
      this.onend_callback = callback;
    }
  
    render(ctx, time, update_preview) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      for (let layer of this.layers) {
        if (layer.start_time > time) {
          continue;
        }
        if (layer.start_time + layer.total_time < time) {
          continue;
        }
        layer.render(ctx, time);
        if (update_preview) {
          layer.show_preview(time);
        }
      }
    }
  
    resize_time() {
      this.time_canvas.style.width = this.time_holder.clientWidth * this.time_scale;
      this.time_canvas.width = this.time_canvas.clientWidth * dpr;
      this.time_canvas.height = this.time_canvas.clientHeight * dpr;
      this.time_ctx.scale(dpr, dpr);
    }
  
    resize() {
      this.canvas.width = this.canvas.clientWidth * dpr;
      this.canvas.height = this.canvas.clientHeight * dpr;
      this.ctx.scale(dpr, dpr);
      this.resize_time();
      for (let layer of this.layers) {
        layer.resize();
      }
    }
  
    loop(realtime) {
      for (let layer of this.layers) {
        if (layer.start_time + layer.total_time > this.total_time) {
          this.total_time = layer.start_time + layer.total_time;
        }
      }
      if (this.last_step === null) {
        this.last_step = realtime;
      }
      if (this.playing && this.total_time > 0) {
        this.time += (realtime - this.last_step);
        if (this.onend_callback && this.time >= this.total_time) {
          this.onend_callback(this);
          this.onend_callback = null;
        }
        if (this.time >= this.total_time) {
          this.refresh_audio();
        }
        this.time %= this.total_time;
      }
      this.last_step = realtime;
      this.time_ctx.clearRect(0, 0, this.time_canvas.clientWidth, this.time_canvas.clientWidth);
      let x = this.time_canvas.clientWidth * this.time / this.total_time;
      this.time_ctx.fillStyle = `rgb(210,210,210)`;
      this.time_ctx.fillRect(x, 0, 2, this.time_canvas.clientHeight);
      this.time_ctx.font = "10px courier";
      this.time_ctx.fillText(this.time.toFixed(2), x + 5, 10);
      this.time_ctx.fillText(this.total_time.toFixed(2), x + 5, 20);
  
      if (this.aux_time > 0) {
        let aux_x = this.time_canvas.clientWidth * this.aux_time / this.total_time;
        this.time_ctx.fillStyle = `rgb(110,110,110)`;
        this.time_ctx.fillRect(aux_x, 0, 1, this.time_canvas.clientHeight);
        this.render(this.cursor_ctx, this.aux_time, false);
      }
  
      let y_inc = this.time_canvas.clientHeight / (this.layers.length + 1);
      let y_coord = this.time_canvas.clientHeight - y_inc;
      for (let layer of this.layers) {
        let selected = this.selected_layer == layer;
        layer.render_time(this.time_ctx, y_coord, 3, selected);
        y_coord -= y_inc;
        if (this.selected_layer == layer && this.update) {
          layer.update(this.update, this.time);
          this.update = null;
        }
      }
      this.render(this.ctx, this.time, true);
      window.requestAnimationFrame(this.loop.bind(this));
    }
  
    addFile(file) {
      if (file.type.indexOf('video') >= 0) {
        this.add(new AudioLayer(file));
        return this.add(new VideoLayer(file));
      } else if (file.type.indexOf('image') >= 0) {
        return this.add(new ImageLayer(file));
      } else if (file.type.indexOf('audio') >= 0) {
        return this.add(new AudioLayer(file));
      }
    }
  
    async addURI(uri) {
      if (!uri) {
        return;
      }
      let extension = uri.split(/[#?]/)[0].split('.').pop().trim();
  
      if (!ext_map[extension]) {
        if (extension == 'json') {
          let response = await fetch(uri);
          let layers = await response.json();
          player.loadLayers(layers);
        }
        return;
      }
      let metadata = {type: ext_map[extension]};
      let segs = uri.split("/");
      let name = segs[segs.length - 1];
      let response = await fetch(uri);
      let data = await response.blob();
      let file = new File([data], name, metadata);
      file.uri = uri;
      return this.addFile(file);
    }
  }
  
  let player = new Player();
  
  window.addEventListener('drop', function(ev) {
    ev.preventDefault();
    if (ev.dataTransfer.items) {
      for (var i = 0; i < ev.dataTransfer.items.length; i++) {
        let item = ev.dataTransfer.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          player.addFile(file);
        } else if (item.kind === 'string' && item.type === 'text/uri-list') {
          item.getAsString(player.addURI);
        }
      }
    }
  });
  
  window.addEventListener('paste', function(ev) {
    let uri = (event.clipboardData || window.clipboardData).getData('text');
    player.addURI(uri);
  });
  
  window.addEventListener('dragover', function(e) {
    e.preventDefault();
  });
  
  window.addEventListener('keydown', function(ev) {
    if (ev.code == "Space") {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } else if (ev.code == "ArrowLeft") {
      player.prev();
    } else if (ev.code == "ArrowRight") {
      player.next();
    } else if (ev.code == "Backspace") {
      player.delete_anchor();
    } else if (ev.code == "KeyS") {
      player.split();
    } else if (ev.code == "KeyI") {
      if (ev.ctrlKey) {
        let uris = prompt("paste comma separated list of URLs").replace(/ /g, '');
        let encoded = encodeURIComponent(uris);
        location.hash = encoded;
      }
    } else if (ev.code == "KeyJ") {
      if (ev.ctrlKey) {
        exportToJson();
      }
    }
  });
  
  function popup(text) {
    const div = document.createElement('div');
    div.addEventListener('keydown', function(ev) {
      ev.stopPropagation();
    });
    const close = document.createElement('a');
    close.addEventListener('click', function() {
      div.remove();
    });
    close.textContent = "[x]";
    close.classList.toggle('close');
    div.appendChild(close);
    div.appendChild(text);
    div.classList.toggle('popup');
    document.body.appendChild(div);
  }
  
  window.addEventListener('load', function() {
    var xhr = new XMLHttpRequest();
    let url = "https://jott.live/raw/mebm_hit";
    xhr.open("GET", url, true);
    xhr.send(null);
    
    document.getElementById('layer_holder').addEventListener("touchmove", function(e) {
      e.stopPropagation();
    }, { passive: false });
    document.getElementById('export').addEventListener('click', download);
  
    if (location.hash) {
      let l = decodeURIComponent(location.hash.substring(1));
      for (let uri of l.split(',')) {
        player.addURI(uri);
      }
      location.hash = "";
      return;
    }
    let localStorage = window.localStorage;
    let seen = localStorage.getItem('_seen');
    if (!seen || false) {
      const text = document.createElement('div');
      text.innerHTML = `welcome!
        <br>
        <br>
        to start, drag in or paste URLs to videos and images.
        <br>
        A live version can be found <a href="https://clipmaker.io" target="_blank">Clipmaker.io</a>
        and usage information <a href="https://github.com/alisrbdni/clipmaker#usage" target="_blank">here</a>.
        `;
      popup(text);
      localStorage.setItem('_seen', 'true');
    }
  });
  
  window.onbeforeunload = function() {
    return true;
  }
  
  window.addEventListener('resize', function() {
    player.resize();
  });
  
  window.addEventListener("touchmove", function(e) {
    e.preventDefault();
  }, { passive: false });
  
  function add_text() {
    let t = prompt("enter text");
    if (t) {
      player.add(new TextLayer(t));
    }
  }
  
  function exportVideo(blob) {
    alert("Warning: exported video may need to be fixed with cloudconvert.com or similar tools");
    const vid = document.createElement('video');
    vid.controls = true;
    vid.src = URL.createObjectURL(blob);
    backgroundElem(vid);
    let extension = blob.type.split(';')[0].split('/')[1];
  
    function make_a() {
      let h = document.getElementById('header');
      let a = h.querySelector('#download');
      if (!a) {
        a = document.createElement('a');
        a.id = 'download';
        a.download = (new Date()).getTime() + '.' + extension;
        a.textContent = 'download';
      }
      a.href = vid.src;
      document.getElementById('header').appendChild(a);
    }
    vid.ontimeupdate = function() {
      this.ontimeupdate = () => {
        return;
      }
      make_a();
      vid.currentTime = 0;
    }
    make_a();
    vid.currentTime = Number.MAX_SAFE_INTEGER;
  }
  
  function uploadSupportedType(files) {
    let badUserExtensions = [];
  
    for (let file of files) {
      let extension = file.name.split('.').pop();
      if (!(extension in ext_map)) {
        badUserExtensions.push(file)
      }
    }
  
    if (badUserExtensions.length) {
      const badFiles = badUserExtensions.map((ext)=>"- "+ext.name).join('<br>');
      const text = document.createElement('div');
      text.style.textAlign = "left";
      text.innerHTML = `
      the file(s) you uploaded are not supported :
      <br>
      <br>
      ${badFiles}
      `;
      popup(text);
    }
    return !badUserExtensions.length > 0;
  }
  
  function upload() {
    let f = document.getElementById('filepicker');
    f.addEventListener('input', function(e) {
      if(!uploadSupportedType(e.target.files)){return}
      for (let file of e.target.files) {
        player.addFile(file);
      }
      f.value = '';
    });
    f.click();
  }
  
  function getSupportedMimeTypes() {
    const VIDEO_TYPES = [
      "webm",
      "ogg",
      "mp4",
      "x-matroska"
    ];
    const VIDEO_CODECS = [
      "vp9",
      "vp9.0",
      "vp8",
      "vp8.0",
      "avc1",
      "av1",
      "h265",
      "h.265",
      "h264",
      "h.264",
      "opus",
    ];
  
    const supportedTypes = [];
    VIDEO_TYPES.forEach((videoType) => {
      const type = `video/${videoType}`;
      VIDEO_CODECS.forEach((codec) => {
        const variations = [
          `${type};codecs=${codec}`,
          `${type};codecs:${codec}`,
          `${type};codecs=${codec.toUpperCase()}`,
          `${type};codecs:${codec.toUpperCase()}`
        ]
        variations.forEach(variation => {
          if (MediaRecorder.isTypeSupported(variation))
            supportedTypes.push(variation);
        })
      });
      if (MediaRecorder.isTypeSupported(type)) supportedTypes.push(type);
    });
    return supportedTypes;
  }
  
  function download(ev) {
    if (ev.shiftKey) {
      exportToJson();
      return;
    }
    if (player.layers.length == 0) {
      alert("nothing to export");
      return;
    }
    const e = document.getElementById('export');
    const e_text = e.textContent;
    e.textContent = "exporting...";
    const chunks = [];
    const stream = player.canvas.captureStream();
  
    let has_audio = false;
    for (let layer of player.layers) {
      if (layer instanceof AudioLayer) {
        has_audio = true;
        break;
      }
    }
    if (has_audio) {
      let dest = player.audio_ctx.createMediaStreamDestination();
      player.audio_dest = dest;
      let tracks = dest.stream.getAudioTracks();
      stream.addTrack(tracks[0]);
    }
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = e => chunks.push(e.data);
    const available_types = getSupportedMimeTypes();
    if (available_types.length == 0) {
      alert("cannot export! please use a screen recorder instead");
    }
    rec.onstop = e => exportVideo(new Blob(chunks, {
      type: available_types[0],
    }));
    player.pause();
    player.time = 0;
    player.play();
    rec.start();
    player.onend(function(p) {
      rec.stop();
      player.audio_dest = null;
      e.textContent = e_text;
      player.pause();
      player.time = 0;
    });
  }
  