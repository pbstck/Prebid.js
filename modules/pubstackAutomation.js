import * as utils from '../src/utils.js';

const events = require('../src/events.js');
var CONSTANTS = require('../src/constants.json');

var BID_WON = CONSTANTS.EVENTS.BID_WON;
var AUCTION_END = CONSTANTS.AUCTION_END;

const defaultOptions = {
  root: null,
  rootMargin: '0px',
  threshold: [0, 0.3, 0.5, 1],
};

const trackers = new Map();

export function assertIsDefined(expr, errorMessage) {
  if (expr === undefined || expr === null) {
    throw new Error(errorMessage || `Expected value to be defined, but received '${expr}'`);
  }
}

const intersectionObserverCallback = (entries) => {
  entries.forEach((entry) => {
    const tracker = trackers.get(entry.target.id);
    assertIsDefined(tracker, `Tracker not found, @elementId=${entry.target.id}`);
    handleIntersection(tracker, entry.intersectionRatio);
  });
};

export const track = (elementId, options) => {
  const observer = new IntersectionObserver(intersectionObserverCallback, defaultOptions);
  const element = document.getElementById(elementId);
  assertIsDefined(element, `ElementId not found, @elementId=${elementId}`);
  observer.observe(element);
  const tracker = new Tracker(elementId, options);
  trackers.set(elementId, tracker);
  return tracker;
};

const automatedRefresh = function (refreshTime) {
  utils.logInfo('[pubstackAutomate] calling automatedRefresh')

  const refreshBid = function (adUnit) {
    const eventHTML = document.getElementById('refreshText');
    if (eventHTML !== null) {
      eventHTML.innerText = 'refreshing ' + adUnit;
    }
    $$PREBID_GLOBAL$$.requestBids({
      adUnitCodes: [adUnit],
      labels: ['allowPubstackRefresh'],
      bidsBackHandler: function (responses) {
        Object.keys(responses).forEach(function (adUnit) {
          const ads = $$PREBID_GLOBAL$$.getHighestCpmBids(adUnit);
          ads.forEach(function (ad) {
            const iframe = document.getElementById(adUnit);
            iframe && $$PREBID_GLOBAL$$.renderAd(iframe.contentWindow.document, ad.adId);
          });
        });
      },
    });
  };

  const isBidWon = function (event) {
    return event && event.eventType && event.eventType === 'bidWon';
  };

  const isAuctionEnd = function (event) {
    return event && event.eventType && event.eventType === 'auctionEnd';
  };

  const startTracker = function (data) {
    const adUnit = data.adUnitCode;
    // be sure we don't do a duplicate here (if adUnit already tracked, destroy tracker). This logic is already implemented in monitoring.js!
    const tracker = track(adUnit);
    tracker.onVisibleTime(1000).then(() => {
      utils.logMessage('[pubstackAutomate] [Viewability] element ', adUnit, 'has been in view for 1000 ms (MRC standards)');
    });
    tracker.onTotalTime(refreshTime).then(() => {
      utils.logMessage('[pubstackAutomate] [Viewability] element ', adUnit, 'has been tracked for ', refreshTime, ' ms');
    });
    tracker.onConditionsReached().then((id) => {
      if (tracker.inView !== true) {
        tracker.addEventListener('onVisible', () => {
          utils.logInfo('[pubstackAutomate] refreshing ', adUnit);
          refreshBid(adUnit);
        });
      } else {
        utils.logInfo('[pubstackAutomate] refreshing', adUnit);
        refreshBid(adUnit);
      }
    });
  };

  const hasEmptyBids = function (adUnitCode, event) {
    if (event.bidsReceived.length === 0) {
      return true;
    } else {
      return event.bidsReceived.filter((bid) => bid.adUnitCode === adUnitCode).length === 0;
    }
  };

  const handleAuctionEnd = function (event) {
    utils.logInfo('[pubstackAutomate] auction end :', event);
    if (event && event.bidsReceived && event.adUnitCodes) {
      event.adUnitCodes.filter((adUnitCode) => hasEmptyBids(adUnitCode, event)).forEach((adUnitCode) => startTracker({ adUnitCode: adUnitCode, auctionEnd: event.auctionEnd }));
    }
  };
  const eventList = events.getEvents();
  eventList
    .filter(isBidWon)
    .map((event) => event.args)
    .forEach(startTracker);

  eventList
    .filter(isAuctionEnd)
    .map((event) => event.args)
    .forEach(handleAuctionEnd);

  events.on(BID_WON, startTracker);
  events.on(AUCTION_END, handleAuctionEnd);
};

const pubstack = $$PREBID_GLOBAL$$.pubstack || {};

pubstack.runPubstackAutomate = function (refreshTime = 5000) {
  automatedRefresh(refreshTime);
  $$PREBID_GLOBAL$$.pubstack.blockingRefreshes = true;
};

$$PREBID_GLOBAL$$.pubstack = pubstack;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const defaultsOptionsOnVisibleTime = {
  cumulative: false
};

const defaultMinPercentageInView = elementId => {
  const htmlElement = document.getElementById(elementId);
  assertIsDefined(htmlElement);
  const styles = window.getComputedStyle(htmlElement);
  const width = Number(styles.getPropertyValue('width').replace(/px/, ''));
  const height = Number(styles.getPropertyValue('height').replace(/px/, ''));
  return width * height > 242000 ? 0.3 : 0.5;
};

class Tracker {
  constructor(elementId, options) {
    var _options$minPercentag;

    _defineProperty(this, 'cumulativeMode', false);

    _defineProperty(this, 'minPercentageInView', void 0);

    _defineProperty(this, 'inView', void 0);

    _defineProperty(this, 'elementId', void 0);

    _defineProperty(this, 'timerTotalElapsed', void 0);

    _defineProperty(this, 'timerVisibleElapsed', void 0);

    _defineProperty(this, 'callbacks', {});

    _defineProperty(this, 'promises', []);

    this.elementId = elementId;
    this.timerTotalElapsed = new Timer['Timer']();
    this.timerTotalElapsed.start();
    this.timerVisibleElapsed = new Timer['Timer']();
    this.minPercentageInView = (_options$minPercentag = options === null || options === void 0 ? void 0 : options.minPercentageInView) !== null && _options$minPercentag !== void 0 ? _options$minPercentag : defaultMinPercentageInView(elementId);
  }

  onVisibleTime(ms = 1000, options) {
    var _options$cumulative;

    this.cumulativeMode = (_options$cumulative = options === null || options === void 0 ? void 0 : options.cumulative) !== null && _options$cumulative !== void 0 ? _options$cumulative : defaultsOptionsOnVisibleTime.cumulative;
    const promise = new Promise(resolve => {
      this.timerVisibleElapsed.timeTargetReached(ms).then(() => {
        resolve(this.elementId);
      });
    });
    this.promises.push(promise);
    return promise;
  }

  onTotalTime(ms) {
    const promise = new Promise(resolve => {
      this.timerTotalElapsed.timeTargetReached(ms).then(() => {
        resolve(this.elementId);
      });
    });
    this.promises.push(promise);
    return promise;
  }

  addEventListener(eventName, callback) {
    this.callbacks[eventName] = callback;
  }

  onConditionsReached() {
    return new Promise(resolve => {
      Promise.all(this.promises).then(() => resolve(this.elementId));
    });
  }
};

const handleIntersection = (tracker, intersectionRatio) => {
  if (intersectionRatio >= tracker.minPercentageInView) {
    if (tracker.inView !== true) {
      if (tracker.callbacks.onVisible) tracker.callbacks.onVisible(tracker.elementId);
      tracker.timerVisibleElapsed.start();
      tracker.inView = true;
    }
  }

  if (intersectionRatio < tracker.minPercentageInView) {
    if (tracker.inView !== false) {
      if (tracker.callbacks.onNotVisible) tracker.callbacks.onNotVisible(tracker.elementId);
      tracker.cumulativeMode ? tracker.timerVisibleElapsed.pause() : tracker.timerVisibleElapsed.stop();
      tracker.inView = false;
    }
  }
};

class Timer {
  constructor() {
    _defineProperty(this, 'elapsedTime', 0);

    _defineProperty(this, 'state', 'new');

    _defineProperty(this, 'lastTickAt', void 0);

    _defineProperty(this, 'timeoutId', void 0);

    _defineProperty(this, 'timeTargets', []);
  }

  static setPacing(ms) {
    Timer.pacing = ms;
  }

  start() {
    if (this.state === 'stopped') this.elapsedTime = 0;
    if (this.state === 'started') return this.elapsed();
    this.lastTickAt = performance.now();
    this.state = 'started';
    this.timeoutId = setTimeout(() => this.update(), Timer.pacing);
    return this.elapsedTime;
  }

  pause() {
    if (this.state === 'paused' || this.state === 'stopped') return this.elapsedTime;
    const elapsed = this.update();
    this.state = 'paused';
    return elapsed;
  }

  stop() {
    if (this.state === 'stopped') return this.elapsedTime;
    const elapsed = this.update();
    this.state = 'stopped';
    return elapsed;
  }

  timeTargetReached(timeTarget) {
    return new Promise(resolve => {
      this.timeTargets.push([timeTarget, resolve]);
    });
  }

  elapsed() {
    if (this.state === 'started') this.update();
    return this.elapsedTime;
  }

  update() {
    let nextTickInMs = Timer.pacing;

    if (this.state === 'started') {
      const now = performance.now(); // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

      const timeElapsedSinceLastTick = now - this.lastTickAt;
      this.elapsedTime += timeElapsedSinceLastTick;
      this.lastTickAt = now;

      for (let i = this.timeTargets.length; i--;) {
        const [target, resolve] = this.timeTargets[i];

        if (this.elapsedTime >= target) {
          resolve(target);
          this.timeTargets.slice(i, 1);
        } else {
          nextTickInMs = Math.min(nextTickInMs, target - this.elapsedTime);
        }
      }
    }

    if (this.state !== 'stopped') {
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => this.update(), nextTickInMs);
    }

    return this.elapsedTime;
  }
}

_defineProperty(Timer, 'pacing', 100);
