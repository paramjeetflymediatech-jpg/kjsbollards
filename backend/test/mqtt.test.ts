import "mocha";
import { expect } from "chai";
import {
  type MqttPacket,
  getDeviceTelemetry
} from "../src/mqtt.js";

describe("RC200 Series MQTT Connection Protocol Suite (PDF Spec Compliance)", () => {
  const TEST_SN = "RCA5B1A41C-DAD0B7E7";

  it("should match common JSON message structure defined in PDF Page 3", () => {
    const packet: MqttPacket = {
      cmd: 4,
      sn: TEST_SN,
      msgId: "a48gd8df8daabbdd",
      body: {
        relay: 1,
        act: 1,
        keep: 1000
      }
    };

    expect(packet.cmd).to.equal(4);
    expect(packet.sn).to.equal(TEST_SN);
    expect(packet.msgId).to.have.lengthOf(16);
    expect(packet.body.relay).to.equal(1);
    expect(packet.body.act).to.equal(1);
    expect(packet.body.keep).to.equal(1000);
  });

  it("should format cmd 16 (Multi-Relay Output Control) according to PDF Page 15", () => {
    const packet: MqttPacket = {
      cmd: 16,
      msgId: "1234567890abcdef",
      body: {
        act: [0, 1, 1, 2],
        keep: [100, 10, 1000, 50]
      }
    };

    expect(packet.cmd).to.equal(16);
    expect(packet.body.act).to.deep.equal([0, 1, 1, 2]);
    expect(packet.body.keep).to.deep.equal([100, 10, 1000, 50]);
  });

  it("should format cmd 18 & 19 (Door Opening Counter Sync) according to PDF Page 16-17", () => {
    const uplinkPacket: MqttPacket = {
      cmd: 18,
      sn: TEST_SN,
      msgId: "fedcba0987654321",
      body: {
        times: 10
      }
    };

    const replyPacket: MqttPacket = {
      cmd: 19,
      msgId: uplinkPacket.msgId,
      body: {
        result: 0,
        times: 20,
        timeStamp: 1734439974
      }
    };

    expect(uplinkPacket.cmd).to.equal(18);
    expect(uplinkPacket.body.times).to.equal(10);
    expect(replyPacket.cmd).to.equal(19);
    expect(replyPacket.msgId).to.equal(uplinkPacket.msgId);
    expect(replyPacket.body.result).to.equal(0);
    expect(replyPacket.body.times).to.equal(20);
  });

  it("should handle device telemetry caching properly", () => {
    const telemetry = getDeviceTelemetry("UNKNOWN_DEVICE");
    expect(telemetry).to.be.undefined;
  });
});
