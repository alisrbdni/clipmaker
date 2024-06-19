class TextLayer extends MoveableLayer {
    constructor(text) {
      let f = {
        name: text
      };
      super(f);
      this.color = "#ffffff";
      this.shadow = true;
      this.ready = true;
    }
  
    init(player, preview) {
      super.init(player, preview);
  
      let settings = new Settings();
  
      settings.add('text', null,
        i => i.value = this.name,
        e => this.update_name(e.target.value),
        'textarea'
      );
  
      settings.add('color', 'color',
        i => i.value = this.color,
        e => this.color = e.target.value
      );
  
      settings.add('shadow', 'checkbox',
        i => i.checked = this.shadow,
        e => this.shadow = e.target.checked
      );
  
      let settings_link = document.createElement('a');
      settings_link.style.float = "right";
      settings_link.textContent = "[...]";
      settings_link.addEventListener('click', function() {
        popup(settings.div);
      });
      this.title_div.appendChild(settings_link);
    }
  
    update(change, ref_time) {
      let rect = this.ctx.measureText(this.name);
      this.width = rect.width;
      this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
      super.update(change, ref_time);
    }
  
    render(ctx_out, ref_time) {
      let f = this.getFrame(ref_time);
      if (f) {
        let scale = f[2];
        this.ctx.font = Math.floor(scale * 30) + "px Georgia";
        let lines = this.name.split('\n');
        let rect = this.ctx.measureText(this.name);
        this.width = rect.width;
        this.height = rect.actualBoundingBoxAscent + rect.actualBoundingBoxDescent;
        let x = f[0] + this.canvas.width / 2;
        let y = f[1] + this.canvas.height / 2;
        if (this.shadow) {
          this.ctx.shadowColor = "black";
          this.ctx.shadowBlur = 7;
        } else {
          this.ctx.shadowColor = null;
          this.ctx.shadowBlur = null;
        }
        this.ctx.fillStyle = this.color;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(f[3] * (Math.PI / 180));
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.name, 0, 0);
        this.ctx.restore();
        this.drawScaled(this.ctx, ctx_out);
      }
    }
  }
  