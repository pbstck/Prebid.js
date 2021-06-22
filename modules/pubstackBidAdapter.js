import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'pubstack';

const isBidRequestValid = function(bid) {
  utils.logInfo('[PBSTCK SSP] isBidRequestValid');
  return bid !== undefined;
}

const buildRequests = function(validBidRequests, bidderRequest) {
  utils.logInfo('[PBSTCK SSP] buildRequests');

  return validBidRequests.map(bidRequest => {
    return {
      method: 'GET',
      url: `http://localhost/ssp`,
      data: `slots=1&rand=${Math.random()}`,
      bidRequest
    };
  })
}

const interpretResponse = function(serverResponse, bidRequest) {
  utils.logInfo('[PBSTCK SSP] interpretResponse');
  utils.logInfo('[PBSTCK SSP] interpretResponse serverResponse', serverResponse);
  utils.logInfo('[PBSTCK SSP] interpretResponse bidRequest', bidRequest);

  const data = serverResponse.body;
  return {
    requestId: bidRequest.bidRequest.bidId,
    cpm: data.cpm,
    currency: data.currency,
    width: data.width,
    height: data.height,
    creativeId: data.creativeId,
    dealId: data.dealId,
    netRevenue: true,
    ttl: 5000,
    ad: data.ad,
    mediaType: data.mediaType,
    meta: data.meta
    /* meta: {
        advertiserDomains: [ARRAY_OF_ADVERTISER_DOMAINS],
        advertiserId: ADVERTISER_ID,
        advertiserName: ADVERTISER_NAME,
        agencyId: AGENCY_ID,
        agencyName: AGENCY_NAME,
        brandId: BRAND_ID,
        brandName: BRAND_NAME,
        dchain: DEMAND_CHAIN_OBJECT,
        mediaType: MEDIA_TYPE,
        networkId: NETWORK_ID,
        networkName: NETWORK_NAME,
        primaryCatId: IAB_CATEGORY,
        secondaryCatIds: [ARRAY_OF_IAB_CATEGORIES]
    } */
  };
}

const getUserSyncs = function(syncOptions, serverResponses, gdprConsent, uspConsent) {
  utils.logInfo('[PBSTCK SSP] getUserSyncs');
}

const onTimeout = function(timeoutData) {
  utils.logInfo('[PBSTCK SSP] onTimeout');
}

const onBidWon = function(bid) {
  utils.logInfo('[PBSTCK SSP] onBidWon');
}

const onSetTargeting = function(bid) {
  utils.logInfo('[PBSTCK SSP] onSetTargeting');
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['pbstck'], // short code
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
  getUserSyncs: getUserSyncs,
  onTimeout: onTimeout,
  onBidWon: onBidWon,
  onSetTargeting: onSetTargeting
}
registerBidder(spec);
