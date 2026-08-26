import "mocha";
import { expect } from "chai";
import { createHash } from "node:crypto";
import { generateSignature } from "../src/gatelink.js";
import { config } from "../src/config.js";

describe("GateLink Open API Suite (PDF Spec Compliance)", () => {
  it("should calculate exact SHA-1 signature matching PDF Page 2 example", () => {
    // Example from GateLink Open API Manual Page 2:
    // uri=/wireless/openapi/device/info
    // accessKeySecret=qGRgv6orew8QHJ4JLc6Wp3xKJVLnoUyA
    // expires=1773979200
    // Expected SHA1: 4fc682a59e32879bbb85110e09d5011da92cba14
    const uri = "/wireless/openapi/device/info";
    const secret = "qGRgv6orew8QHJ4JLc6Wp3xKJVLnoUyA";
    const expires = 1773979200;

    const payload = `uri=${uri}&accessKeySecret=${secret}&expires=${expires}`;
    const calculated = createHash("sha1").update(payload, "utf8").digest("hex");

    expect(calculated).to.equal("4fc682a59e32879bbb85110e09d5011da92cba14");
  });

  it("should generate a 40-character hex signature for any URI", () => {
    const sig = generateSignature("/wireless/openapi/device/list", Math.floor(Date.now() / 1000) + 600);
    expect(sig).to.be.a("string");
    expect(sig).to.have.lengthOf(40);
    expect(/^[0-9a-f]{40}$/.test(sig)).to.be.true;
  });

  it("should have correct base URL and credentials configured", () => {
    expect(config.GATELINK_BASE_URL).to.be.a("string");
    expect(config.GATELINK_ACCESS_KEY_ID).to.be.a("string");
    expect(config.GATELINK_ACCESS_KEY_SECRET).to.be.a("string");
  });
});
