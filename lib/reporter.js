/*
 * nightwatch-html-reporter
 * https://github.com/jls/nightwatch-html-reporter
 *
 * A reporter for nightwatch that generates HTML reports.
 * Example nightwatch/globals.js:
 * var HtmlReporter = require('nightwatch-html-reporter');
 * var htmlReporter = new HtmlReporter({openBrowser: true, reportsDirectory: __dirname + '/reports'});
 * module.exports = {
 *   reporter: htmlReporter.fn
 * }
 * Copyright (c) 2014 James Smith
 * Licensed under the MIT license.
 */
var _ = require('lodash'),
    renderer = require('./renderer'),
    open = require('open'),
    async = require('async'),
    normalize = require('./normalize'),
    logger = require('./logger');

module.exports = function(options) {

  var opts = _.defaults({}, options, {
    reportsDirectory: __dirname + '/reports',
    openBrowser: true,
    hideSuccess: false,
    reportFilename: 'report.html',
    themeName: 'default',
    logLevel: 1,
    debug: {
      saveNightwatch: false
    }
  });

  logger.setLevel(opts.logLevel);

  this.fn = function(results, done) {

    var sendAlert = function (obj) {

      var nodemailer = require('nodemailer');

      var transporter = nodemailer.createTransport({
          service: obj.transport.service,
          auth: {
              user: obj.transport.auth.user,
              pass: obj.transport.auth.pass
          }
      });

      var mailOptions = {
          from: obj.sender,
          to: obj.recipients.join(','),
          subject: obj.subject,
          html: obj.html,
          text: obj.text
      };

      transporter.sendMail(mailOptions, function(error, info){
          if(error){
              return console.log(error);
          }
          console.log('Message sent: ' + info.response);

      });
    };

    var generate = function generate(next) {

      async.waterfall([
        normalize.bind(this, { fromXML: false, hideSuccess: opts.hideSuccess }, results),
        renderer.bind(this, opts)
      ], function(err, reportFilename) {

        if (err) {
          logger.error('Error generating report: ' + err.toString());
          return done(err);
        }

        logger.info('HTML Report Generated at: ' + reportFilename);
        if (opts.openBrowser)
          open(reportFilename);

        opts.alertOnFailure = opts.alertOnFailure || {};
        if(opts.alertOnFailure.enabled) { 
          sendAlert( opts.alertOnFailure );
          logger.info('Email Alert Sent');
        }
        
        done();

      });
    };

    async.series([
      function saveResults(next) {
        if (opts.debug.saveNightwatch) {
          logger.log('Saving Nightwatch Report Object');
          var fs = require('fs');
          fs.writeFile(opts.debug.saveNightwatch, JSON.stringify(results, null, '\t'), function(err) {
            next(err);
          });
        } else {
          next(null);
        }
      },
      generate
    ], function(err) {
      done(err.toString());
    });

  };

};
