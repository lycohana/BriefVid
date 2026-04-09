import assert from "node:assert/strict";

import { deriveRuntimeDeviceLabel } from "../src/appModel.ts";

function run(name: string, fn: () => void) {
  fn();
  console.log(`ok - ${name}`);
}

run("shows CPU when settings are loaded and whisper_device has fallen back to cpu", () => {
  const label = deriveRuntimeDeviceLabel({
    whisperDevice: "cpu",
    cudaAvailable: true,
    hasSettings: true,
  });

  assert.equal(label, "CPU");
});

run("shows GPU while settings are still loading but environment has CUDA available", () => {
  const label = deriveRuntimeDeviceLabel({
    whisperDevice: undefined,
    cudaAvailable: true,
    hasSettings: false,
  });

  assert.equal(label, "GPU");
});

run("shows CPU while settings are still loading and CUDA is unavailable", () => {
  const label = deriveRuntimeDeviceLabel({
    whisperDevice: undefined,
    cudaAvailable: false,
    hasSettings: false,
  });

  assert.equal(label, "CPU");
});
