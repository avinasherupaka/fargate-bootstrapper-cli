/**
 * Terminal Stepper
 * @description Leverages Signale Lib to provide abstraction
 */

const { Signale } = require('signale');

const signaleOptions = {
  interactive: true,
  scope: 'Spectrum',
};

class Stepper {
  constructor(steps = [], opts = {}) {
    this.steps = steps;
    this.signale = new Signale(Object.assign({}, signaleOptions, opts));
    this.maxSteps = steps.length;
    this.currentStep = 0;
  }

  next(status) {
    if (!this.steps.length || this.currentStep === this.maxSteps) {
      return this.complete();
    }
    const step = this.steps.shift();

    // eslint-disable-next-line
    this.currentStep++;

    return this.signale.await('[%d/%d] - %s', this.currentStep, this.maxSteps, (status || step));
  }

  fail(err) {
    return this.signale.fatal(err);
  }

  complete(message = 'Operation completed successfully') {
    return this.signale.success(message);
  }
}

module.exports = Stepper;
