var AudioContext = window.AudioContext || window.webkitAudioContext || false;

class AudioLayer extends RenderedLayer {
  constructor(file) {
    super(file);
    this.reader = new FileReader();
    this.audio_ctx = new AudioContext();
    this.audio_buffer = null;
    this.source = null;
    this.playing = false;
    this.last_time = 0;
    this.last_ref_time = 0;
    this.reader.addEventListener("load", (function() {
      let buffer = this.reader.result;
      this.audio_ctx.decodeAudioData(buffer, (aud_buffer) => {
        this.audio_buffer = aud_buffer;
        this.total_time = this.audio_buffer.duration * 1000;
        if (this.total_time === 0) {
          this.player.remove(this);
        }
        this.ready = true;
      }, (function(e) {
        this.player.remove(this);
      }).bind(this));
    }).bind(this));
    this.reader.readAsArrayBuffer(file);
  }

  disconnect() {
    if (this.source) {
      this.source.disconnect(this.player.audio_ctx.destination);
    }
  }

  init_audio(ref_time) {
    this.disconnect();
    this.source = this.player.audio_ctx.createBufferSource();
    this.source.buffer = this.audio_buffer;
    this.source.connect(this.player.audio_ctx.destination);
    if (this.player.audio_dest) {
      this.source.connect(this.player.audio_dest);
    }
    this.started = false;
  }

  init(player, preview) {
    super.init(player, preview);
  }

  update_name(name) {
    this.name = name;
    this.description.textContent = "\"" + this.name + "\" [audio]";
  }

  render(ctx_out, ref_time) {
    if (!this.ready) {
      return;
    }
    if (!this.player.playing) {
      return;
    }
    let time = ref_time - this.start_time;
    if (time < 0 || time > this.total_time) {
      return;
    }
    if (!this.started) {
      if (!this.source) {
        init_audio(ref_time);
      }
      this.source.start(0, time / 1000);
      this.started = true;
    }
  }
}
