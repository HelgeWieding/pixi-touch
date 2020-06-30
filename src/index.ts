import { Sprite } from 'pixi.js';

export default class PixiTouch {
  private _lastScale: number | null = null;
  private _lastRotation: number | null = null;
  private _lastPanX: number | null = null;
  private _lastPanY: number | null = null;
  private _lastTick: number | null = null;
  private _lastTap = performance.now();
  private _lastPress: number | null = null;
  private _pressInterval: number | null = null;

  private _doubleTapDuration = -1;
  private _doubleTapPointer = -1;
  private _longPressDuration = -1;
  private _longPressPointer = -1;

  private _doubleTapAdded = false;
  private _longPressAdded = false;

  private _defaultOpt = {
    duration: 300,
    nPointer: 1,
  }

  onDoubleTap: Function | null = null;
  onLongPress: Function | null = null;
  onPinch: Function | null = null;

  constructor(private _displayObj: Sprite) {
    this.addEvents();
  }

  addDoubleTap(options: { duration: number; nPointer: number }) {
    this._doubleTapDuration = options.duration;
    this._doubleTapPointer = options.nPointer;
    this._doubleTapAdded = true;
  }

  checkDoubleTap(startPress: number, duration: number, nPointers: number) {
    
    if (!this.onDoubleTap) {
      return;
    }

    if (nPointers !== this._doubleTapPointer) {
      return;
    }

    if (startPress && performance.now() - startPress < duration) {
      // tapped
      const currentTap = performance.now();
      const tapTime = currentTap - this._lastTap;

      if (tapTime < duration) {
        this.onDoubleTap({ tapTime, target: this._displayObj });
      }
      this._lastTap = currentTap;
    }
  }

  addLongPress(options: { duration: number; nPointer: number }) {
    this._longPressDuration = options.duration;
    this._longPressPointer = options.nPointer;
    this._longPressAdded = true;
  }

  checkLongPress(duration: number, nPointer: number) {

    if (!this.onLongPress) {
      return;
    }

    if (nPointer !== this._longPressPointer) {
      return;
    }

    this._pressInterval = setInterval(() => {
      if (this._lastPress && performance.now() - this._lastPress > duration) {
        this.onLongPress({ pressed: performance.now() - this._lastPress, target: this._displayObj });
        if (this._pressInterval) {
          clearInterval(this._pressInterval);
        }
      } 
    }, 50);
  }

  checkPinch(e: any, t: any) {

    if (!this.onPinch) {
      return;
    }

    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    const scale = Math.sqrt(dx * dx + dy * dy);
    const rotation = Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX);

    const now = Date.now();

    let interval;

    if (this._lastTick) {
      interval = now - this._lastTick;
    }

    this._lastTick = Date.now();

    const center = {
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2
    };

    const panX = t[1].clientX;
    const panY = t[1].clientY;
    
    const event = {
      panX,
      panY,
      scale,
      rotation,
      deltaScale: this._lastScale ? scale / this._lastScale : null,
      deltaRotation: this._lastRotation ? rotation - this._lastRotation : null,
      deltaPanY: this._lastPanY ? panY - this._lastPanY : null,
      deltaPanX: this._lastPanX ? panX - this._lastPanX : null,
      velocity: interval ? scale / interval : 0,
      center: center,
      data: e.data,
    };
    
    this._lastPanY = panY;
    this._lastPanX = panX;
    
    this._lastRotation = rotation;
    this._lastScale = scale;

    this.onPinch(event);
  }

  move(e: any) {

    const t = e.data.originalEvent.targetTouches;
    
    if (!t || t.length !== 2) {
      return;
    }

    this.checkPinch(e, t);
  }

  start(e: any) {

    const t = e.data.originalEvent.targetTouches;
    
    if (this._lastPress && this._doubleTapAdded) {
      this.checkDoubleTap(this._lastPress, this._doubleTapDuration, t.length);
    }

    if (!this._lastPress && this._longPressAdded) {
      this.checkLongPress(this._longPressDuration, t.length);
    }
    
    if (this._pressInterval) {
      clearInterval(this._pressInterval);
    }
  }

  end(e: any) {
    this._lastPress = performance.now();
    
    if (this._pressInterval) {
      clearInterval(this._pressInterval);
    }

    this._displayObj.removeListener('touchmove', this.move)
    this._lastScale = 0;
    this._lastRotation = 0;
    this._lastPanX = 0;
    this._lastPanY = 0;
  }
  
  on(eventName: string, callback: Function, options: { duration: number; nPointer: number } = this._defaultOpt) {
    if (eventName === 'doubletap') {
       this.addDoubleTap(options);
       this.onDoubleTap = callback;     
    }

    if (eventName === 'longpress') {
      this.addLongPress(options);
      this.onLongPress = callback;
   }

   if (eventName === 'pinch') {
     this.onPinch = callback;
   }
  }

  addEvents() {
    this._displayObj
      .on('touchstart', this.start.bind(this))
      .on('touchmove', this.move.bind(this))
      .on('touchend', this.end.bind(this))
      .on('touchendoutside', this.end.bind(this));
  }
}