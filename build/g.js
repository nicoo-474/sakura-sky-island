/* =========================================================================
   G. 背景音乐：播放真实音频文件（同目录自动探测 / 选文件 / 拖拽）
   ========================================================================= */
const BGM = (function () {
  const el = new Audio();
  el.loop = true;
  el.preload = 'auto';
  let volume = 0.45;
  let loaded = false;
  let trackName = '';
  let objectUrl = null;
  let probeIndex = 0;
  el.volume = volume;

  /* 同目录自动探测：把曲子命名为 bgm.mp3 放进来即可 */
  const CANDIDATES = ['bgm.mp3', 'bgm.ogg', 'bgm.m4a', 'bgm.wav', 'bgm.flac'];

  function markLoaded(name) {
    loaded = true;
    trackName = name;
    el.title = name;
  }

  /* 轮询探测：不依赖事件时序（首屏构建会长时间阻塞主线程） */
  function probe() {
    const name = CANDIDATES[probeIndex];
    if (!name) { loaded = false; return; }
    el.src = name;
    el.load();
    let ticks = 0;
    const timer = setInterval(() => {
      ticks++;
      if (el.duration > 0 && el.readyState >= 1) {
        clearInterval(timer);
        markLoaded(name);
        return;
      }
      if (el.error) {
        clearInterval(timer);
        probeIndex++;
        probe();
        return;
      }
      if (ticks > 80) {
        clearInterval(timer);
        probeIndex++;
        probe();
      }
    }, 250);
  }

  function setVolume(v) {
    volume = clamp(v, 0, 1);
    el.volume = volume;
  }
  function play() {
    if (!loaded) return Promise.resolve(false);
    return el.play().then(() => true).catch(() => false);
  }
  function pause() { el.pause(); }
  function toggle() {
    if (!loaded) return Promise.resolve(false);
    if (el.paused) return play();
    pause();
    return Promise.resolve(false);
  }
  function loadFile(file) {
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    el.src = objectUrl;
    el.load();
    loaded = true;
    trackName = file.name;
    el.title = file.name;
    el.play().catch(() => {});
  }

  probe();

  /* 场景构建会阻塞主线程，可能错过首个事件；空闲后再试一次 */
  function reprobe() { if (loaded) return; probeIndex = 0; probe(); }

  return {
    el, setVolume, play, pause, toggle, loadFile, reprobe,
    get playing() { return loaded && !el.paused; },
    get loaded() { return loaded; },
    get name() { return trackName; },
  };
})();
