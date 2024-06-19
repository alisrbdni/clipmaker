class MoveableLayer extends RenderedLayer {
  constructor(file) {
    super(file);
    // all moveables 2 seconds default
    this.total_time = 2 * 1000;
    this.frames = [];
    for (let i = 0; i < (this.total_time / 1000) * fps; ++i) {
      // x, y, scale, rot, anchor(bool)
      let f = new Float32Array(5);
      f[2] = 1;
      this.frames.push(f);
    }
    this.frames[0][4] = 1;
  }

  dump() {
    let obj = super.dump();
    obj.frames = [];
    for (let f of this.frames) {
      obj.frames.push(Array.from(f));
    }
    return obj;
  }

  adjustTotalTime(diff) {
    this.total_time += diff;
    const num_frames = Math.floor((this.total_time / 1000) * fps - this.frames.length);
    if (num_frames > 0) {
      for (let i = 0; i < num_frames; ++i) {
        let f = new Float32Array(5);
        f[2] = 1; // scale
        this.frames.push(f);
      }
    } else if (num_frames < 0) {
      // prevent overflow
      this.frames.splice(this.frames.length + num_frames + 1, 1 - num_frames);
    }
    const last_frame_time = this.getTime(this.frames.length - 1);
    const prev_anchor = this.nearest_anchor(last_frame_time, false);
    if (prev_anchor >= 0) {
      this.interpolate(prev_anchor);
    } else {
      this.interpolate(0);
    }
  }

  set_anchor(index) {
    this.frames[index][4] = 1;
  }

  is_anchor(index) {
    return this.frames[index][4];
  }

  delete_anchor(ref_time) {
    let i = this.getIndex(ref_time);
    this.frames[i][4] = 0;
    let prev_i = this.nearest_anchor(ref_time, false);
    this.interpolate(prev_i);
  }

  nearest_anchor(time, fwd) {
    if (this.getFrame(time)) {
      let i = this.getIndex(time);
      let inc = function() {
        if (fwd) {
          i++;
        } else {
          i--;
        }
      };
      inc();
      while (i >= 0 && i < this.frames.length) {
        if (this.is_anchor(i)) {
          return i;
        }
        inc();
      }
    }
    return -1;
  }

  interpolate_frame(f0, f1, weight) {
    if (weight > 1) {
      weight = 1;
    } else if (weight < 0) {
      weight = 0;
    }
    let f = new Float32Array(5);
    f[0] = weight * f0[0] + (1 - weight) * f1[0];
    f[1] = weight * f0[1] + (1 - weight) * f1[1];
    f[2] = weight * f0[2] + (1 - weight) * f1[2];
    f[3] = weight * f0[3] + (1 - weight) * f1[3];
    return f;
  }

  interpolate(index) {
    let frame = this.frames[index];
    let is_anchor = this.is_anchor(index);
    let prev_idx = 0;
    let prev_frame = frame;
    let prev_is_anchor = false;
    let next_idx = this.frames.length - 1;
    let next_frame = frame;
    let next_is_anchor = false;

    for (let i = index - 1; i >= 0; i--) {
      if (this.is_anchor(i)) {
        prev_idx = i;
        prev_is_anchor = true;
        prev_frame = this.frames[i];
        break;
      }
    }

    for (let i = index + 1; i < this.frames.length; ++i) {
      if (this.is_anchor(i)) {
        next_idx = i;
        next_is_anchor = true;
        next_frame = this.frames[i];
        break;
      }
    }

    let prev_range = index - prev_idx;
    const eps = 1e-9;
    for (let i = 0; i <= prev_range; ++i) {
      let s = i / (prev_range + eps);
      this.frames[index - i] = this.interpolate_frame(prev_frame, frame, s);
    }
    let next_range = next_idx - index;
    for (let i = 0; i <= next_range; ++i) {
      let s = i / (next_range + eps);
      this.frames[index + i] = this.interpolate_frame(next_frame, frame, s);
    }
    if (prev_is_anchor) {
      this.set_anchor(prev_idx);
    }
    if (next_is_anchor) {
      this.set_anchor(next_idx);
    }
    if (is_anchor) {
      this.set_anchor(index);
    }
  }

  getIndex(ref_time) {
    let time = ref_time - this.start_time;
    let index = Math.floor(time / 1000 * fps);
    return index;
  }

  getTime(index) {
    return (index / fps * 1000) + this.start_time;
  }

  getFrame(ref_time) {
    let index = this.getIndex(ref_time);
    if (index < 0 || index >= this.frames.length) {
      return null;
    }
    let frame = new Float32Array(this.frames[index]);
    if (index + 1 < this.frames.length) {
      const diff = ref_time - this.getTime(index);
      const diff_next = this.getTime(index + 1) - ref_time;
      let next_frame = this.frames[index + 1];
      let s = diff_next / (diff + diff_next);
      frame = this.interpolate_frame(frame, next_frame, s);
    }
    return frame;
  }

  update(change, ref_time) {
    let f = this.getFrame(ref_time);
    if (!f) {
      return;
    }
    let index = this.getIndex(ref_time);
    if (change.scale) {
      const old_scale = f[2];
      const new_scale = f[2] * change.scale;
      let delta_x = ((this.width * old_scale) - (this.width * new_scale)) / 2;
      let delta_y = ((this.height * old_scale) - (this.height * new_scale)) / 2;
      this.frames[index][0] = f[0] + delta_x;
      this.frames[index][1] = f[1] + delta_y;
      this.frames[index][2] = new_scale;
      this.interpolate(index);
      this.set_anchor(index);
    }
    if (change.x) {
      this.frames[index][0] = change.x;
      this.interpolate(index);
      this.set_anchor(index);
    }
    if (change.y) {
      this.frames[index][1] = change.y;
      this.interpolate(index);
      this.set_anchor(index);
    }
    if (change.rotation) {
      this.frames[index][3] = f[3] + change.rotation;
      this.interpolate(index);
      this.set_anchor(index);
    }
  }

  render_time(ctx, y_coord, base_width, selected) {
    super.render_time(ctx, y_coord, base_width, selected);
    let scale = ctx.canvas.clientWidth / this.player.total_time;
    let width = 4 * base_width;
    for (let i = 0; i < this.frames.length; ++i) {
      if (this.is_anchor(i)) {
        let anchor_x = this.start_time + 1000 * (i / fps);
        ctx.fillStyle = `rgb(100,210,255)`;
        ctx.fillRect(scale * anchor_x, y_coord - width / 2, 3, width);
      }
    }
  }
}
