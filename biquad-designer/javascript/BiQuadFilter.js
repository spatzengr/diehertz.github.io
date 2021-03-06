/***************************************************************************
 *   Copyright (C) 2017, Paul Lutus                                        *
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program; if not, write to the                         *
 *   Free Software Foundation, Inc.,                                       *
 *   59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.             *
 ***************************************************************************/

var BiQuadFilter = BiQuadFilter || {}


BiQuadFilter.PT1 = 0;
BiQuadFilter.LOWPASS = 1;
BiQuadFilter.HIGHPASS = 2;
BiQuadFilter.BANDPASS = 3;
BiQuadFilter.PEAK = 4;
BiQuadFilter.NOTCH = 5;
BiQuadFilter.LOWSHELF = 6;
BiQuadFilter.HIGHSHELF = 7;
BiQuadFilter.CONT_1ST_LOWPASS = 8;
BiQuadFilter.CONT_2ND_LOWPASS = 9;

BiQuadFilter.a0 = 0;
BiQuadFilter.a1 = 0;
BiQuadFilter.a2 = 0;
BiQuadFilter.b0 = 0;
BiQuadFilter.b1 = 0;
BiQuadFilter.b2 = 0;
BiQuadFilter.x1 = 0;
BiQuadFilter.x2 = 0;
BiQuadFilter.y1 = 0;
BiQuadFilter.y2 = 0;
BiQuadFilter.type = 0;
BiQuadFilter.center_freq = 0;
BiQuadFilter.sample_rate = 0;
BiQuadFilter.Q = 0;
BiQuadFilter.gainDB = 0;

BiQuadFilter.create = function(type, center_freq, sample_rate, Q, gainDB = 0) {
  BiQuadFilter.configure(type, center_freq, sample_rate, Q, gainDB);
}

BiQuadFilter.reset = function() {
  BiQuadFilter.x1 = BiQuadFilter.x2 = BiQuadFilter.y1 = BiQuadFilter.y2 = 0;
}

BiQuadFilter.frequency = function() {
  return BiQuadFilter.center_freq;
}

BiQuadFilter.configure = function(type,center_freq,sample_rate, Q, gainDB) {
  BiQuadFilter.functions = [
  BiQuadFilter.f_pt1,
  BiQuadFilter.f_lowpass,
  BiQuadFilter.f_highpass,
  BiQuadFilter.f_bandpass,
  BiQuadFilter.f_peak,
  BiQuadFilter.f_notch,
  BiQuadFilter.f_lowshelf,
  BiQuadFilter.f_highshelf,
  BiQuadFilter.f_cont_lowpass1,
  BiQuadFilter.f_cont_lowpass2
  ];
  BiQuadFilter.reset();
  BiQuadFilter.Q = (Q == 0) ? 1e-9 : Q;
  BiQuadFilter.type = type;
  BiQuadFilter.sample_rate = sample_rate;
  if (BiQuadFilter.type == BiQuadFilter.CONT_1ST_LOWPASS || BiQuadFilter.type == BiQuadFilter.CONT_2ND_LOWPASS) {
    BiQuadFilter.sample_rate *= 2;
  }
  BiQuadFilter.gainDB = gainDB;
  BiQuadFilter.reconfigure(center_freq);
}

// allow parameter change while running
BiQuadFilter.reconfigure = function(cf) {
  BiQuadFilter.center_freq = cf;
  // only used for peaking and shelving filters
  var gain_abs = Math.pow(10, BiQuadFilter.gainDB / 40);
  var omega = 2 * Math.PI * cf / BiQuadFilter.sample_rate;
  var sn = Math.sin(omega);
  var cs = Math.cos(omega);
  var alpha = sn / (2 * BiQuadFilter.Q);
  var beta = Math.sqrt(gain_abs + gain_abs);
  
  // call the corresponding setup function
  BiQuadFilter.functions[BiQuadFilter.type](gain_abs,omega,sn,cs,alpha,beta);
  
  // by prescaling filter constants, eliminate one variable
  BiQuadFilter.b0 /= BiQuadFilter.a0;
  BiQuadFilter.b1 /= BiQuadFilter.a0;
  BiQuadFilter.b2 /= BiQuadFilter.a0;
  BiQuadFilter.a1 /= BiQuadFilter.a0;
  BiQuadFilter.a2 /= BiQuadFilter.a0;
}

BiQuadFilter.f_pt1 = function(gain_abs,omega,sn,cs,alpha,beta) {
  BiQuadFilter.b0 = sn;
  BiQuadFilter.b1 = sn;
  BiQuadFilter.b2 = 0;
  BiQuadFilter.a0 = sn + cs + 1;
  BiQuadFilter.a1 = sn - cs - 1;
  BiQuadFilter.a2 = 0;
}

BiQuadFilter.f_cont_lowpass1 = function(gain_abs,omega,sn,cs,alpha,beta) {
  var w_c = 2 * Math.PI * BiQuadFilter.center_freq;

  BiQuadFilter.b0 = w_c;
  BiQuadFilter.b1 = 0;
  BiQuadFilter.b2 = 0;
  BiQuadFilter.a0 = w_c;
  BiQuadFilter.a1 = 1;
  BiQuadFilter.a2 = 0;
}

BiQuadFilter.f_cont_lowpass2 = function(gain_abs,omega,sn,cs,alpha,beta) {
  var w_c = 2 * Math.PI * BiQuadFilter.center_freq;

  BiQuadFilter.b0 = w_c * w_c;
  BiQuadFilter.b1 = 0;
  BiQuadFilter.b2 = 0;
  BiQuadFilter.a0 = w_c * w_c;
  BiQuadFilter.a1 = 2 * BiQuadFilter.Q * w_c;
  BiQuadFilter.a2 = 1;
}

BiQuadFilter.f_bandpass = function(center_freq,gain_abs,omega,sn,cs,alpha,beta) {
  BiQuadFilter.b0 = alpha;
  BiQuadFilter.b1 = 0;
  BiQuadFilter.b2 = -alpha;
  BiQuadFilter.a0 = 1 + alpha;
  BiQuadFilter.a1 = -2 * cs;
  BiQuadFilter.a2 = 1 - alpha;
}

BiQuadFilter.f_lowpass = function(gain_abs,omega,sn,cs,alpha,beta) {
  BiQuadFilter.b0 = (1 - cs) / 2;
  BiQuadFilter.b1 = 1 - cs;
  BiQuadFilter.b2 = (1 - cs) / 2;
  BiQuadFilter.a0 = 1 + alpha;
  BiQuadFilter.a1 = -2 * cs;
  BiQuadFilter.a2 = 1 - alpha;
}

BiQuadFilter.f_highpass = function(gain_abs,omega,sn,cs,alpha,beta) {
  BiQuadFilter.b0 = (1 + cs) / 2;
  BiQuadFilter.b1 = -(1 + cs);
  BiQuadFilter.b2 = (1 + cs) / 2;
  BiQuadFilter.a0 = 1 + alpha;
  BiQuadFilter.a1 = -2 * cs;
  BiQuadFilter.a2 = 1 - alpha;
}

BiQuadFilter.f_notch = function(gain_abs,omega,sn,cs,alpha,beta) {
  BiQuadFilter.b0 = 1;
  BiQuadFilter.b1 = -2 * cs;
  BiQuadFilter.b2 = 1;
  BiQuadFilter.a0 = 1 + alpha;
  BiQuadFilter.a1 = -2 * cs;
  BiQuadFilter.a2 = 1 - alpha;
}

BiQuadFilter.f_peak = function(gain_abs,omega,sn,cs,alpha,beta) {
  BiQuadFilter.b0 = 1 + (alpha * gain_abs);
  BiQuadFilter.b1 = -2 * cs;
  BiQuadFilter.b2 = 1 - (alpha * gain_abs);
  BiQuadFilter.a0 = 1 + (alpha / gain_abs);
  BiQuadFilter.a1 = -2 * cs;
  BiQuadFilter.a2 = 1 - (alpha / gain_abs);
}

BiQuadFilter.f_lowshelf = function(gain_abs,omega,sn,cs,alpha,beta) {
  BiQuadFilter.b0 = gain_abs * ((gain_abs + 1) - (gain_abs - 1) * cs + beta * sn);
  BiQuadFilter.b1 = 2 * gain_abs * ((gain_abs - 1) - (gain_abs + 1) * cs);
  BiQuadFilter.b2 = gain_abs * ((gain_abs + 1) - (gain_abs - 1) * cs - beta * sn);
  BiQuadFilter.a0 = (gain_abs + 1) + (gain_abs - 1) * cs + beta * sn;
  BiQuadFilter.a1 = -2 * ((gain_abs - 1) + (gain_abs + 1) * cs);
  BiQuadFilter.a2 = (gain_abs + 1) + (gain_abs - 1) * cs - beta * sn;
}

BiQuadFilter.f_highshelf = function(gain_abs,omega,sn,cs,alpha,beta) {
  BiQuadFilter.b0 = gain_abs * ((gain_abs + 1) + (gain_abs - 1) * cs + beta * sn);
  BiQuadFilter.b1 = -2 * gain_abs * ((gain_abs - 1) + (gain_abs + 1) * cs);
  BiQuadFilter.b2 = gain_abs * ((gain_abs + 1) + (gain_abs - 1) * cs - beta * sn);
  BiQuadFilter.a0 = (gain_abs + 1) - (gain_abs - 1) * cs + beta * sn;
  BiQuadFilter.a1 = 2 * ((gain_abs - 1) - (gain_abs + 1) * cs);
  BiQuadFilter.a2 = (gain_abs + 1) - (gain_abs - 1) * cs - beta * sn;
}

// provide a static amplitude result for testing
BiQuadFilter.amplitude = function(f) {
  var b0 = BiQuadFilter.b0;
  var b1 = BiQuadFilter.b1;
  var b2 = BiQuadFilter.b2;
  var a1 = BiQuadFilter.a1;
  var a2 = BiQuadFilter.a2;

  if (BiQuadFilter.type == BiQuadFilter.CONT_1ST_LOWPASS || BiQuadFilter.type == BiQuadFilter.CONT_2ND_LOWPASS) {
    var w = 2 * Math.PI * f;

    var a = b0 - b2 * w * w;
    var b = b1 * w;
    var c = 1 - a2 * w * w;
    var d = a1 * w;

    var denom = c * c + d * d;
    var real = (a * c + b * d) / denom;
    var img = (b * c - a * d) / denom;

    return Math.sqrt(real * real + img * img);
  } else {
    var phi = Math.pow((Math.sin(2.0 * Math.PI * f / (2.0 * BiQuadFilter.sample_rate))), 2.0);
    var r = (Math.pow(b0 + b1 + b2, 2.0) - 4.0 * (b0 * b1 + 4.0 * b0 * b2 + b1 * b2) * phi + 16.0 * b0 * b2 * phi * phi) / (Math.pow(1.0 + a1 + a2, 2.0) - 4.0 * (a1 + 4.0 * a2 + a1 * a2) * phi + 16.0 * a2 * phi * phi);
    r = (r < 0)?0:r;
    return Math.sqrt(r);
  }
}

BiQuadFilter.phase = function(f) {
  var b0 = BiQuadFilter.b0;
  var b1 = BiQuadFilter.b1;
  var b2 = BiQuadFilter.b2;
  var a1 = BiQuadFilter.a1;
  var a2 = BiQuadFilter.a2;

  if (BiQuadFilter.type == BiQuadFilter.CONT_1ST_LOWPASS || BiQuadFilter.type == BiQuadFilter.CONT_2ND_LOWPASS) {
    var w = 2 * Math.PI * f;

    var a = b0 - b2 * w * w;
    var b = b1 * w;
    var c = 1 - a2 * w * w;
    var d = a1 * w;

    var denom = c * c + d * d;
    var real = (a * c + b * d) / denom;
    var img = (b * c - a * d) / denom;

    var arg = Math.atan2(img, real);

    return arg;
  } else {
    var omega = 2 * Math.PI * f / BiQuadFilter.sample_rate;

    var cos = Math.cos(omega);
    var cos2 = Math.cos(2 * omega);
    var sin = Math.sin(omega);
    var sin2 = Math.sin(2 * omega);

    var denom = 1 + Math.pow(a1, 2) + Math.pow(a2, 2) + 2 * a1 * cos + 2 * a2 * cos2 + 2 * a1 * a2 * cos;
    var real  = (b0 * a1 + b1 + b1 * a2 + b2 * a1) * cos + (b0 * a2 + b2) * cos2 + (b0 + b1 * a1 + b2 * a2);
    var img   = (b0 * a1 - b1 + b1 * a2 - b2 * a1) * sin + (b0 * a2 - b2) * sin2;

    var arg = Math.atan2(img / denom, real / denom);

    return arg;
  }
}

// provide a static decibel result for testing
BiQuadFilter.log_amplitude = function(f) {
  var r;
  try {
    r = 20 * Math.log10(BiQuadFilter.amplitude(f));
  }
  catch (e) {
    //console.log(e);
    r = -100;
  }
  if(!isFinite(r) || isNaN(r)) {
    r = -100;
  }
  return r;
}

// return the constant set for this filter
BiQuadFilter.constants = function() {
  return [BiQuadFilter.a1, BiQuadFilter.a2,BiQuadFilter.b0, BiQuadFilter.b1, BiQuadFilter.b2];
}

// perform one filtering step
BiQuadFilter.filter = function(x) {
  var y = BiQuadFilter.b0 * x + BiQuadFilter.b1 * BiQuadFilter.x1 + BiQuadFilter.b2 * BiQuadFilter.x2 - BiQuadFilter.a1 * BiQuadFilter.y1 - BiQuadFilter.a2 * BiQuadFilter.y2;
  BiQuadFilter.x2 = BiQuadFilter.x1;
  BiQuadFilter.x1 = BiQuadFilter.x;
  BiQuadFilter.y2 = BiQuadFilter.y1;
  BiQuadFilter.y1 = y;
  return (y);
}