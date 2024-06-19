class Settings {
    constructor() {
      this.div = document.createElement('div');
      this.div.classList.toggle('settings');
      this.holder = document.createElement('div');
      this.holder.classList.toggle('holder');
      this.div.appendChild(this.holder);
      const ok = document.createElement('a');
      ok.textContent = '[apply]'
      this.div.appendChild(ok);
    }
  
    add(name, type, init, callback, elem_type='input') {
      let label = document.createElement('label');
      label.textContent = name;
      let setting = document.createElement(elem_type);
      setting.addEventListener('change', callback);
      if (type) {
        setting.type = type;
      }
      init(setting);
      this.holder.appendChild(label);
      this.holder.appendChild(setting);
    }
  }
  
  function updateSettings() {
    let settings = new Settings();
    settings.add('fps', 'text',
      e => e.value = fps.toFixed(2),
      e => fps = Number.parseInt(e.target.value)
    );
    settings.add('max RAM (in MB)', 'text',
      e => e.value = (max_size / 1e6).toFixed(2),
      e => max_size = 1e6 * Number.parseInt(e.target.value)
    );
    popup(settings.div);
  }
  