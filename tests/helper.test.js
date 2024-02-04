'use strict';

const fs = require('fs');
let helper;

describe('helper tests debug = true', () => {
  beforeAll(() => {
    // before all tests

  });

  beforeEach(() => {
    // Reset data before each test
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    process.env.LDAP_DEBUG = "true";
    helper = require('../src/helper');
  });

  afterEach(() => {
    // Clean up after each test
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  afterAll(() => {
    // Clean up after all tests have run
    // delete process.env.NODE_ENV;
    // delete process.env.LDAP_SYNC_TIME;
  });
  test('csv files', () => {
    let ldapSyntaxes = helper.ReadCSVfile('./schema/ldapSyntaxes.csv', function (row) { if (Array.isArray(row)) return row.join(","); else return row; });
    expect(ldapSyntaxes).toHaveLength(32);
    expect(ldapSyntaxes[0]).toBe("( 1.3.6.1.4.1.1466.115.121.1.4 DESC 'Audio' X-NOT-HUMAN-READABLE 'TRUE' )");
    expect(ldapSyntaxes[31]).toBe("( 1.3.6.1.1.16.1 DESC 'UUID' )");
  });

  test('json files', () => {
    //
    let content = { "hello": { "World": "World#2" } };
    let sr = helper.SaveJSONtoFile(content, "./test.json");

    expect(sr).toBe(true);
    expect(fs.existsSync("./test.json")).toBe(true);

    expect(helper.ReadJSONfile("./test.json")).toStrictEqual(content);

    if (fs.existsSync("./test.json"))
      fs.unlinkSync("./test.json");

    expect(fs.existsSync("./test.json")).toBe(false);

    let sr2 = helper.SaveJSONtoFile(content, "notExisting:\\path\\test.json");
    expect(sr2).toBe(false);

    expect(helper.ReadJSONfile("./test.json")).toStrictEqual({});

    expect(helper.IsJsonString(null)).toBe(false);
    expect(helper.IsJsonString()).toBe(false);
    expect(helper.IsJsonString("")).toBe(false);
    expect(helper.IsJsonString({})).toBe(false);
    expect(helper.IsJsonString([])).toBe(false);

    expect(helper.ReadJSONfile("./tests/test_wrongformat.txt")).toStrictEqual({});
  });

  test('json empty file', () => {
    fs.writeFileSync('./test.json', '');

    expect(helper.ReadJSONfile("./test.json")).toStrictEqual({});

    if (fs.existsSync("./test.json"))
      fs.unlinkSync("./test.json");

  });

  test('logs', () => {
    console.log.mockClear();
    helper.log("HELPER-LOG");
    expect(console.log).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls.toString()).toMatch(/(HELPER-LOG)/i);

    console.warn.mockClear();
    helper.warn("HELPER-WARN");
    expect(console.warn).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls.toString()).toMatch(/(HELPER-WARN)/i);

    console.error.mockClear();
    helper.error("HELPER-ERROR");
    expect(console.error).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls.toString()).toMatch(/(HELPER-ERROR)/i);

    console.log.mockClear();
    helper.forceLog("HELPER-FORCELOG");
    expect(console.log).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls.toString()).toMatch(/(HELPER-FORCELOG)/i);

    console.log.mockClear();
    helper.trace("HELPER-TRACE");
    expect(console.log).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls.toString()).toMatch(/(HELPER-TRACE)/i);

    console.log.mockClear();
    helper.debug("HELPER-DEBUG");
    expect(console.log).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls.toString()).toMatch(/(HELPER-DEBUG)/i);
  });

  test('misc', () => {
    // Run your test here
    expect(helper.escapeLDAPspecialChars("hello+world")).toBe('hello\\+world');
    expect(helper.unescapeLDAPspecialChars("hello\\+world")).toBe('hello+world');
    expect(helper.md4("helloworld")).toBe('72FC5EF38C07F24388017C748CEAB330');

    // let ln = helper.ldap_now(2);
    // expect(ln).toBe("");
    let ln = "20230314204751";
    let ld = new Date(Date.UTC(2023, 2, 14, 20, 47, 51, 0));
    expect(helper.ldap_now_2_date(ln)).toStrictEqual(ld);
    expect(helper.ldap_now_2_date("")).toBe(undefined);
    expect(helper.ldap_now_2_date(undefined)).toBe(undefined);


    let d = new Date();
    d.setDate(d.getDate() + 5);
    d = d.toISOString().replace(/T/, ' ').replace(/\..+/, '').replaceAll('-', '').replaceAll(':', '').replaceAll(' ', '');
    expect(helper.ldap_now(5)).toBe(d);
  });

});


describe('helper tests debug = false', () => {
  beforeAll(() => {
    // before all tests
  });

  beforeEach(() => {
    // Reset data before each test
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    process.env.LDAP_DEBUG = "false";
    helper = require('../src/helper');
  });

  afterEach(() => {
    // Clean up after each test
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  afterAll(() => {
    // Clean up after all tests have run
    // delete process.env.NODE_ENV;
    // delete process.env.LDAP_SYNC_TIME;
  });

  test('log debug=false', () => {
    process.env.LDAP_DEBUG = "false";
    console.log.mockClear();
    helper.log("HELPER-LOG");
    expect(console.log).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledTimes(0);
  });

  test('readfile', () => {
    expect(helper.ReadFile('nonExistent', 'ascii')).toBe('');
    expect(helper.ReadFile('nonExistent')).toBe('');
    expect(helper.ReadFile('./tests/azure.test.json', 'ascii')).not.toBe('');
    expect(helper.ReadFile('./tests/azure.test.json')).not.toBe('');

  });

  test('csv files without function', () => {
    let ldapSyntaxes = helper.ReadCSVfile('./schema/ldapSyntaxes.csv');
    expect(ldapSyntaxes).toHaveLength(32);
    expect(ldapSyntaxes[0]).toStrictEqual(["( 1.3.6.1.4.1.1466.115.121.1.4 DESC 'Audio' X-NOT-HUMAN-READABLE 'TRUE' )"]);
    expect(ldapSyntaxes[31]).toStrictEqual(["( 1.3.6.1.1.16.1 DESC 'UUID' )"]);

    let ldapSyntaxes2 = helper.ReadCSVfile('./schema/ldapSyntaxes.csv', null, 'utf8', 0);
    expect(ldapSyntaxes2[0]).not.toStrictEqual(["( 1.3.6.1.4.1.1466.115.121.1.4 DESC 'Audio' X-NOT-HUMAN-READABLE 'TRUE' )"]);
    expect(ldapSyntaxes2[30]).toStrictEqual(["( 1.3.6.1.1.16.1 DESC 'UUID' )"]);

  });

});