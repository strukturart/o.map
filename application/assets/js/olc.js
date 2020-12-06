/**
 * TinyOLC - Open Location Code for smallest applications
 * Differences from Google's open-source JS implementation:
 * - less than 600 bytes minified (as opposed to over 4.5 KB from Google)
 * - only 2 methods exposed - encode (lat, lng => str) and decode (str => [lat, lng])
 * - only floating point degrees accepted as encoding input (positive as N and E, negative as S and W)
 * - no short code resolution
 * - no area encoding, only points with 11-digit resolution
 * - assuming the block lower left corner only when decoding a low-res code
 * - no validation checks
 * - public domain
 * @author Luxferre 2020
 * @license Unlicense <unlicense.org>
 */

OLC = (function () {
  var alpha = "23456789CFGHJMPQRVWX";
  return {
    encode: function (lat, lng) {
      var res = [],
        i = 0,
        latr,
        lngr,
        fact = 20;
      for (lat += 90, lng += 180; i < 11; i += 2) {
        //main step
        if (i === 8) res[i++] = "+";
        res[i] = alpha[(latr = 0 | (lat / fact))];
        res[i + 1] = alpha[(lngr = 0 | (lng / fact))];
        lat -= latr * fact;
        lng -= lngr * fact;
        fact /= 20;
      }
      return (
        res.join("") +
        alpha[4 * (0 | (lat / fact / 4)) + (0 | (lng / fact / 5))]
      ); //additional step
    },
    decode: function (code) {
      code = code
        .split(0)[0]
        .split("")
        .map(function (c) {
          return (c = alpha.indexOf(c)) > -1 ? c : NaN;
        })
        .filter(isFinite);
      var lat,
        lng,
        i,
        fact = 20,
        l = code.length,
        bl = l > 10 ? 10 : l;
      for (lat = lng = i = 0; i < bl; i += 2) {
        //main step
        lat += code[i] * fact;
        lng += code[i + 1] * fact;
        fact /= 20;
      }
      if (l > 10) {
        //additional step
        fact = 125e-6;
        lat += fact * (0 | (code[10] / 5));
        lng += fact * (code[10] % 4);
      }
      return [lat - 90, lng - 180].map(function (n) {
        return Math.round(n * 1e6) / 1e6;
      });
    },
  };
})();
