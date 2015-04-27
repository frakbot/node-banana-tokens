#!/bin/env node

'use strict';

const webdriver = require('selenium-webdriver');
const winston = require('winston');
const fs = require('q-io/fs');

let logger;
let driver;

const getRandomTime = function() {
  return (Math.random() * (3000 - 1000)) + 1000;
};

const atob = function(str) {
  return new Buffer(str, 'base64').toString('binary');
};

const loginUrl = atob('aHR0cDovL3d3dy5pYW5rZXIuY29tL3VzZXIucGhwP2FjdD1sb2dpbg==');
const tokenUrl = atob('aHR0cDovL3d3dy5pYW5rZXIuY29tL3VzZXIucGhw');

const username = process.argv[2];
const password = process.argv[3];

const setup = function() {
  return fs.exists('logs/')
    .then(function(existsLogDir) {
      if (!existsLogDir) {
        return fs.makeDirectory('logs');
      }
    })
    .then(function() {
      logger = new (winston.Logger)({
        transports: [
          new (winston.transports.Console)(),
          new (winston.transports.File)({
            filename: 'logs/' + (new Date()).toISOString().replace(/:/g, '') + '.log',
            json: false
          })
        ]
      });
      logger.info('Aye aye, commander.');
      driver = buildDriver();
    });
};

const buildDriver = function() {
  logger.info('Opening the browser...');
  return new webdriver.Builder()
    .forBrowser('phantomjs')
    .build();
};

const login = function() {
  logger.info('Driver built. Opening login page...');
  // Open the login page
  return driver
    .get(loginUrl)
    .then(function() {
      logger.info('Login page loaded...');
      // Input user data
      driver
        .findElement(webdriver.By.css('input[name="username"]'))
        .sendKeys(username);
      driver
        .findElement(webdriver.By.css('input[name="password"]'))
        .sendKeys(password);

      // Sleep for a while
      driver.sleep(getRandomTime());

      // Submit the form
      return driver
        .findElement(webdriver.By.css('form.sign_form'))
        .submit();
    })
    .then(function() {
      return driver
        .findElement(webdriver.By.css('p.message_content'))
        .getText()
    })
    .then(function(loginResult) {
      if (loginResult !== 'Login successful.') {
        throw new Error('Login unsuccessful.');
      }
      return true;
    });
};

const getTokenPage = function() {
  return driver.get(tokenUrl)
    .then(function() {
      return driver.wait(function() {
        return driver.executeScript('return jQuery.isReady');
      });
    });
};

const logCurrentTokens = function() {
  return driver
    .findElement(webdriver.By.css('#memberside_bucks'))
    .getText()
    .then(function(tokens) {
      logger.info('You have %s tokens.', tokens);
      return tokens;
    });
};

const getTodaysTokens = function() {
  const elementCriteria = webdriver.By.css('.get_pb');
  return driver
    .isElementPresent(elementCriteria)
    .then(function(canGetTokens) {
      if (!canGetTokens) {
        throw new Error('Today\'s tokens were already mined.');
      }
      return canGetTokens;
    })
    .then(function() {
      const button = driver.findElement(webdriver.By.css('.get_pb'));
      return button.click();
    })
    .then(function() {
      return driver.sleep(getRandomTime() + '5000');
    })
    .then(function() {
      return driver.isElementPresent(webdriver.By.css('.get_pb_disable'));
    })
    .then(function(hasNewTokens) {
      if (!hasNewTokens) {
        throw new Error('Token request failed.');
      }
    });
};

const overAndOut = function() {
  logger.info('Over and out, browser.');
  driver.sleep(getRandomTime())
    .then(function() {
      logger.info('Over and out, commander.');
      driver.quit();
    });
};

setup()
  .then(login)
  .then(getTokenPage)
  .then(logCurrentTokens)
  .then(getTodaysTokens)
  .then(logCurrentTokens)
  .catch(function(error) {
    logger.error(error.message);
  })
  .finally(overAndOut);

