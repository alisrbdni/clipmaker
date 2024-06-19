import { Player } from './player.js';
import { exportToJson } from './export.js';

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
};

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
    };
    make_a();
    vid.currentTime = 0;
  };
  make_a();
  vid.currentTime = Number.MAX_SAFE_INTEGER;
}

function uploadSupportedType(files) {
  let badUserExtensions = [];

  for (let file of files) {
    let extension = file.name.split('.').pop();
    if (!(extension in ext_map)) {
      badUserExtensions.push(file);
    }
  }

  if (badUserExtensions.length) {
    const badFiles = badUserExtensions.map((ext) => "- " + ext.name).join('<br>');
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
    if (!uploadSupportedType(e.target.files)) { return; }
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
      ];
      variations.forEach(variation => {
        if (MediaRecorder.isTypeSupported(variation))
          supportedTypes.push(variation);
      });
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
