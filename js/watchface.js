// Renders the LCD watch face using the same layered PNG assets as the
// Flutter dev app (ollee_watch_app_oap_dev/lib/components/watchFace.dart),
// driven by a state object that mirrors WatchFaceDisplay + WatchFace.

const ASSET_BASE = 'assets/watchface/';

class WatchFace {
  constructor(rootEl) {
    this.root = rootEl;
    this.layers = new Map();

    this.state = {
      clockDigits: '',
      weekdayDigits: '',
      dayDigits: '',
      colon: false,
      pm: false,
      hr: false,
      lap: false,
      split: false,
      bell: false,
      chime: false,
      audio: true,
      audioDisabled: false,
      light: false,
      lightDisabled: false,
      buttonA: false,
      buttonM: false,
      buttonL: false,
      buttonHoldNotTap: false,
      tilt: false,
      tap: false,
      pulse: false,
    };

    this._buildLayers();
    this._buildAudioHotspot();
    this.render();
  }

  _img(name, key) {
    const el = document.createElement('img');
    el.src = ASSET_BASE + name;
    el.className = 'wf-layer';
    el.dataset.key = key || name;
    this.root.appendChild(el);
    return el;
  }

  _buildLayers() {
    // Background: watchface_bg.png normally, or the "audio off" filler
    // image when the pulse animation is showing (matches Dart's bgVisible
    // logic, which hides the background image stack during a pulse).
    this.bg = this._img('watchface_bg.png', 'bg');

    this.light = this._img('watchface_light_off.png', 'light');
    this.buttonA = this._img('watchface_buttonA_off.png', 'buttonA');
    this.buttonM = this._img('watchface_buttonM_off.png', 'buttonM');
    this.buttonL = this._img('watchface_buttonL_off.png', 'buttonL');
    this.buttonHold = this._img('watchface_button_hold.png', 'buttonHold');
    this.buttonHold.style.display = 'none';

    this.tilt = this._img('watchface_tilt.png', 'tilt');
    this.tilt.style.display = 'none';
    this.tap = this._img('watchface_tap.png', 'tap');
    this.tap.style.display = 'none';

    this.pulse = this._img('watchface_pulse.png', 'pulse');
    this.pulse.style.display = 'none';
    this.cardio = this._img('cardio.gif', 'cardio');
    this.cardio.style.display = 'none';
    this.cardio.classList.add('wf-cardio');

    this.lightDisabled = this._img('watchface_light_disabled.png', 'lightDisabled');
    this.lightDisabled.style.display = 'none';
    this.audioDisabled = this._img('watchface_audio_disabled.png', 'audioDisabled');
    this.audioDisabled.style.display = 'none';
    this.audio = this._img('watchface_audio_on.png', 'audio');

    this.colon = this._img('display/watchface_display_colon.png', 'colon');
    this.bell = this._img('display/watchface_display_bell.png', 'bell');
    this.chime = this._img('display/watchface_display_chime.png', 'chime');
    this.hr = this._img('display/watchface_display_hr.png', 'hr');
    this.lap = this._img('display/watchface_display_lap.png', 'lap');
    this.split = this._img('display/watchface_display_split.png', 'split');
    this.pm = this._img('display/watchface_display_pm.png', 'pm');

    // Positions 0-9: only positions 0/1 (the weekday digits) have the
    // extra 'h'/'i' segments used for wider letterforms; position 0 alone
    // gets 'i'. Positions 2-9 (day + clock digits) are plain 7-segment,
    // matching lcdSegmentsForPosition()'s h/i gating - no PNGs exist for
    // the segments those positions never light, so don't request them.
    this.positions = [];
    for (let p = 0; p < 10; p++) {
      const segs = {};
      for (const seg of segmentsForPosition(p)) {
        const el = this._img(`display/watchface_display_position${p}_${seg}.png`, `pos${p}${seg}`);
        el.style.display = 'none';
        segs[seg] = el;
      }
      this.positions.push(segs);
    }
  }

  // Invisible click target over the speaker icon (covers both the
  // watchface_audio_on.png and watchface_audio_disabled.png artwork
  // bounding boxes) so clicking the icon toggles mute, like tapping the
  // physical indicator on the real watch face.
  _buildAudioHotspot() {
    const hotspot = document.createElement('div');
    hotspot.className = 'wf-audio-hotspot';
    hotspot.title = 'Toggle mute';
    hotspot.addEventListener('click', () => this.toggleMuted());
    this.root.appendChild(hotspot);
    this.audioHotspot = hotspot;
  }

  _show(el, visible) {
    el.style.display = visible ? '' : 'none';
  }

  // --- Public state setters, mirroring the Ollee.* JS API 1:1 ---

  setClockDigits(str) { this.state.clockDigits = str; this.render(); }
  setWeekdayDigits(str) { this.state.weekdayDigits = str; this.render(); }
  setDayDigits(str) { this.state.dayDigits = str; this.render(); }
  setColon(v) { this.state.colon = !!v; this.render(); }
  setLap(v) { this.state.lap = !!v; this.render(); }
  setPm(v) { this.state.pm = !!v; this.render(); }
  setHr(v) { this.state.hr = !!v; this.render(); }
  setBell(v) { this.state.bell = !!v; this.render(); }
  setChime(v) { this.state.chime = !!v; this.render(); }

  clear() {
    Object.assign(this.state, {
      clockDigits: '', weekdayDigits: '', dayDigits: '',
      colon: false, pm: false, hr: false, lap: false, split: false,
      bell: false, chime: false,
    });
    this.render();
  }

  // --- Physical/chrome state (not script-controlled on real hardware,
  // exposed here only so the emulator page can simulate them). ---

  setMuted(v) { this.state.audioDisabled = !!v; this.render(); }
  toggleMuted() { this.setMuted(!this.state.audioDisabled); }

  setButtonA(pressed) { this.state.buttonA = pressed; this.render(); }
  setButtonM(pressed) { this.state.buttonM = pressed; this.render(); }
  setButtonL(pressed) { this.state.buttonL = pressed; this.render(); }
  setTilt(v) { this.state.tilt = v; this.render(); }
  setLed(on) { this.state.light = on; this.render(); }

  render() {
    const s = this.state;

    const clock = (s.clockDigits || '').padEnd(6, ' ').slice(0, 6);
    const weekday = (s.weekdayDigits || '').padStart(2, ' ').slice(-2);
    const day = (s.dayDigits || '').padStart(2, ' ').slice(-2);

    const bgVisible = !s.pulse;
    this._show(this.bg, bgVisible);

    this._show(this.light, bgVisible);
    this.light.src = ASSET_BASE + (s.light ? 'watchface_light_on.png' : 'watchface_light_off.png');

    this._show(this.buttonA, bgVisible);
    this.buttonA.src = ASSET_BASE + (s.buttonA ? 'watchface_buttonA_on.png' : 'watchface_buttonA_off.png');
    this._show(this.buttonM, bgVisible);
    this.buttonM.src = ASSET_BASE + (s.buttonM ? 'watchface_buttonM_on.png' : 'watchface_buttonM_off.png');
    this._show(this.buttonL, bgVisible);
    this.buttonL.src = ASSET_BASE + (s.buttonL ? 'watchface_buttonL_on.png' : 'watchface_buttonL_off.png');
    this._show(this.buttonHold, bgVisible && s.buttonHoldNotTap);

    this._show(this.tilt, s.tilt);
    this._show(this.tap, s.tap);

    this._show(this.pulse, s.pulse);
    this._show(this.cardio, s.pulse);

    this._show(this.lightDisabled, s.lightDisabled);
    this._show(this.audioDisabled, s.audioDisabled);
    this._show(this.audio, s.audio && !s.audioDisabled);

    this._show(this.colon, s.colon);
    this._show(this.bell, s.bell);
    this._show(this.chime, s.chime);
    this._show(this.hr, s.hr);
    this._show(this.lap, s.lap);
    this._show(this.split, s.split);
    this._show(this.pm, s.pm);

    const chars = [
      weekday[0], weekday[1],
      day[0], day[1],
      clock[0], clock[1], clock[2], clock[3], clock[4], clock[5],
    ];

    for (let p = 0; p < 10; p++) {
      const segs = lcdSegmentsForPosition(p, chars[p]);
      const el = this.positions[p];
      for (const seg of segmentsForPosition(p)) {
        this._show(el[seg], !!segs[seg]);
      }
    }
  }
}
