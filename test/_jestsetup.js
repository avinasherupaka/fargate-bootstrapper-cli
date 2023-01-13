global.console.error = jest.fn(); // suppress error messages
global.console.info = jest.fn();

// Enables testing env var which silences certain logs under this flag to prevent flooding of terminal when running tests
global.process.env.TESTING = true;
