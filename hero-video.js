'use strict';
(() => {
  class HeroVideoLayer {
    constructor({container, onEnded = () => {}, onStateChange = () => {}}) {
      this.container = container;
      this.onEnded = onEnded;
      this.onStateChange = onStateChange;
      this.video = this.outgoing = this.media = null;
      this.paused = this.dead = this.failed = false;
      this.inView = true;
      this.attempt = this.timer = 0;
      this.cancelReveal = null;
      this.listeners = new WeakMap();
      this.transitionTimer = 0;
      this.motion = matchMedia('(prefers-reduced-motion: reduce)');
      this.sync = () => this._sync();
      document.addEventListener('visibilitychange', this.sync);
      this.motion.addEventListener('change', this.sync);
      if ('IntersectionObserver' in window) {
        this.intersection = new IntersectionObserver(entries => {
          this.inView = entries[0].isIntersecting;
          this._sync();
        });
        this.intersection.observe(container);
      }
      this.removal = new MutationObserver(() => {
        if (!container.isConnected) this.destroy();
      });
      this.removal.observe(document.documentElement, {childList: true, subtree: true});
    }
    get playing() {
      return !!(this.video && this.active && this._allowed() &&
        !this.video.paused && !this.video.ended && this.video.readyState >= 2);
    }

    show(media) {
      if (this.dead) return;
      this._prepareTransition();
      this.media = media;
      this.failed = false;
      this.state = null;
      if (!media) { this._fadeOutgoing(); this._notify('image'); return; }
      const src = innerWidth <= 800 ? media.mobileSrc || media.src : media.src;
      try {
        const url = new URL(src || '', location.href);
        if (!src || url.origin !== location.origin || !/^https?:$/.test(url.protocol) ||
            url.username || url.password || !/\.mp4$/i.test(url.pathname)) throw Error();
        this.src = url.href;
      } catch {
        this.failed = true;
        this._fadeOutgoing();
        this._notify('fallback');
        return;
      }
      this._sync();
    }
    setPaused(value) { this.paused = !!value; this._sync(); }
    _allowed() {
      return !this.dead && !this.paused && !document.hidden && !this.motion.matches &&
        this.inView && this.container.isConnected;
    }

    _sync() {
      if (this.dead || !this.media || this.failed) return;
      if (!this._allowed()) {
        this.active = false;
        this.attempt++;
        this._clearWait();
        this.cancelReveal?.();
        this.cancelReveal = null;
        this.video?.pause();
        if (this.motion.matches) {
          this._release();
          this._notify('fallback');
        }
        return;
      }
      if (!this.video) { this._notify('loading'); this._create(); }
      const video = this.video;
      if (!video || (!video.paused && !video.ended)) return;
      const attempt = ++this.attempt;
      this._wait(video);
      try {
        const promise = video.play();
        promise?.catch(() => {
          if (attempt === this.attempt && this._allowed()) this._fail(video);
        });
      } catch { this._fail(video); }
    }

    _create() {
      const video = document.createElement('video');
      this.video = video;
      this.presented = false;
      video.muted = video.defaultMuted = true;
      video.playsInline = true;
      video.controls = video.loop = false;
      // Let the browser buffer ahead. The previous frame remains visible until
      // this video has decoded its first frame, so a slow connection does not
      // expose a blank/poster flash between clips.
      video.preload = 'auto';
      video.disablePictureInPicture = video.disableRemotePlayback = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      video.className = 'hero-background-video';
      video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:0;transition:opacity 700ms ease;will-change:opacity;';
      if (this.media.poster) video.poster = this.media.poster;
      const listen = (type, handler) => {
        video.addEventListener(type, handler);
        const listeners = this.listeners.get(video) || [];
        listeners.push([type, handler]);
        this.listeners.set(video, listeners);
      };
      listen('volumechange', () => { video.muted = video.defaultMuted = true; });
      listen('playing', () => {
        if (video !== this.video || !this._allowed()) { video.pause(); return; }
        this.cancelReveal?.();
        const reveal = () => {
          this.cancelReveal = null;
          if (video !== this.video || !this._allowed() || video.paused || video.readyState < 2) return;
          this._clearWait();
          this.presented = true;
          this.active = true;
          video.style.opacity = '1';
          this._completeTransition(video);
          this._notify('playing');
        };
        if (video.requestVideoFrameCallback) {
          const id = video.requestVideoFrameCallback(reveal);
          this.cancelReveal = () => video.cancelVideoFrameCallback(id);
        } else {
          const id = requestAnimationFrame(reveal);
          this.cancelReveal = () => cancelAnimationFrame(id);
        }
      });
      listen('waiting', () => {
        this.active = false;
        this.cancelReveal?.();
        this.cancelReveal = null;
        if (this._allowed()) this._wait(video);
      });
      listen('stalled', () => { if (this._allowed()) this._wait(video); });
      listen('timeupdate', () => {
        if (this.presented && !video.paused && video.readyState >= 3) this._clearWait();
      });
      listen('error', () => this._fail(video));
      listen('ended', () => {
        if (video !== this.video || !this._allowed()) return;
        this.active = false;
        this._clearWait();
        this.onEnded();
      });
      this.container.append(video);
      video.src = this.src;
    }

    _wait(video) {
      if (!this.timer) this.timer = setTimeout(() => {
        this.timer = 0;
        if (this._allowed()) this._fail(video);
      }, 12000);
    }
    _clearWait() { clearTimeout(this.timer); this.timer = 0; }
    _notify(state) {
      if (state !== 'playing' && state === this.state) return;
      this.state = state;
      this.onStateChange(state);
    }
    _fail(video) {
      if (this.dead || video !== this.video) return;
      this.failed = true;
      this._removeVideo(video);
      this.video = null;
      this.active = this.presented = false;
      this._fadeOutgoing();
      this._notify('fallback');
    }

    _prepareTransition() {
      this.attempt++;
      this._clearWait();
      this.cancelReveal?.();
      this.cancelReveal = null;
      clearTimeout(this.transitionTimer);
      this.transitionTimer = 0;
      const video = this.video;
      this.video = null;
      this.active = false;
      this.presented = false;
      if (!video) return;
      this._detach(video);
      video.pause();
      if (Number(video.style.opacity || 0) > 0) {
        this._removeVideo(this.outgoing);
        this.outgoing = video;
      } else {
        this._removeVideo(video);
      }
    }

    _completeTransition(video) {
      const outgoing = this.outgoing;
      if (!outgoing || outgoing === video) return;
      // Start both opacity changes in the same paint for a true cross-fade.
      requestAnimationFrame(() => { outgoing.style.opacity = '0'; });
      clearTimeout(this.transitionTimer);
      this.transitionTimer = setTimeout(() => {
        if (this.outgoing === outgoing) this.outgoing = null;
        this._removeVideo(outgoing);
        this.transitionTimer = 0;
      }, 760);
    }

    _fadeOutgoing() {
      const outgoing = this.outgoing;
      if (!outgoing) return;
      outgoing.style.opacity = '0';
      clearTimeout(this.transitionTimer);
      this.transitionTimer = setTimeout(() => {
        if (this.outgoing === outgoing) this.outgoing = null;
        this._removeVideo(outgoing);
        this.transitionTimer = 0;
      }, 760);
    }

    _detach(video) {
      if (!video) return;
      (this.listeners.get(video) || []).forEach(([type, handler]) => video.removeEventListener(type, handler));
      this.listeners.delete(video);
    }

    _removeVideo(video) {
      if (!video) return;
      this._detach(video);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    }

    _release() {
      this._prepareTransition();
      clearTimeout(this.transitionTimer);
      this.transitionTimer = 0;
      this._removeVideo(this.outgoing);
      this.outgoing = null;
    }

    destroy() {
      if (this.dead) return;
      this.dead = true;
      this._release();
      this.media = null;
      document.removeEventListener('visibilitychange', this.sync);
      this.motion.removeEventListener('change', this.sync);
      this.intersection?.disconnect();
      this.removal.disconnect();
    }
  }
  window.HeroVideoLayer = HeroVideoLayer;
})();
