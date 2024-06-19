function exportToJson() {
    var xhr = new XMLHttpRequest();
    const date = new Date().getTime();
    const str = date + "_" + Math.floor(Math.random() * 1000) + ".json";
    const url = "https://jott.live/save/note/" + str + "/clipmaker";
    xhr.open("POST", url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      note: player.dumpToJson()
    }));
    let uri = encodeURIComponent("https://jott.live/raw/" + str);
    let mebm_url = window.location + "#" + uri;
    const text = document.createElement('div');
    const preamble = document.createElement('span');
    preamble.textContent = "copy the link below to share:";
    const a = document.createElement('a');
    a.href = mebm_url;
    a.setAttribute("target", "_blank");
    a.textContent = "[link]";
  
    const json = document.createElement('pre');
    json.textContent = player.dumpToJson();
    json.style.overflow = 'scroll';
    json.style.wordBreak = 'break-all';
    json.style.height = '50%';
    text.appendChild(preamble);
    text.appendChild(document.createElement('br'));
    text.appendChild(document.createElement('br'));
    text.appendChild(a);
    text.appendChild(document.createElement('br'));
    text.appendChild(document.createElement('br'));
    const preamble2 = document.createElement('span');
    preamble2.textContent = "or save and host the JSON below";
    text.appendChild(preamble2);
    text.appendChild(document.createElement('br'));
    text.appendChild(document.createElement('br'));
    text.appendChild(json);
    popup(text);
  }
  