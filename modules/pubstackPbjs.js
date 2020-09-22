import $$PREBID_GLOBAL$$ from '../src/prebid.js';
import * as utils from '../src/utils.js';

const adUnits = [];

const pubstack = $$PREBID_GLOBAL$$.pubstack || {};
if (!pubstack.blockingRefreshes) {
  pubstack.blockingRefreshes = false;
}
$$PREBID_GLOBAL$$.pubstack = pubstack;

$$PREBID_GLOBAL$$.que.push(function() {
  const handlerRequestBids = {
    apply: function (target, that, args) {
      utils.logMessage('[pubstackPbjs] [proxy] catch apply', that, ' on prebid target is ', target, ' args are ', args);
      const newAdUnitCodes = [];
      args[0].adUnitCodes.forEach(code => {
        if (!adUnits.includes(code)) {
          adUnits.push(code);
          newAdUnitCodes.push(code);
        } else if (!$$PREBID_GLOBAL$$.pubstack.blockingRefreshes || (args[0].labels && args[0].labels.includes('allowPubstackRefresh'))) {
          newAdUnitCodes.push(code);
        } else {
          utils.logMessage('[pubstackPbjs] removing ', code, ' from requestBids list');
        }
      });

      if (newAdUnitCodes.length === 0) {
        utils.logInfo('[pubstackPbjs] blocking call to pbjs requestBids on ', args[0].adUnitCodes);
      } else {
        args[0].adUnitCodes = newAdUnitCodes;
        utils.logInfo('[pubstackPbjs] calling pbjs requestBids on ', newAdUnitCodes);
        return Reflect.apply(target, that, args);
      }
    }
  };

  const proxyRequestBids = new Proxy($$PREBID_GLOBAL$$.requestBids, handlerRequestBids);
  $$PREBID_GLOBAL$$.requestBids = proxyRequestBids;
});
