import { mergeBinaryMask } from "../lib/canvas/maskUtils";

test("mergeBinaryMask overwrites with brush value", () => {
  const base = new Uint8ClampedArray([0, 255, 0, 255]);
  const patch = new Uint8ClampedArray([255, 255, 0, 0]);

  const result = mergeBinaryMask(base, patch);

  expect(Array.from(result)).toEqual([255, 255, 0, 0]);
});
