import "@testing-library/jest-dom/vitest";

if (!URL.createObjectURL) {
  Object.defineProperty(URL, "createObjectURL", {
    value: () => "blob:stub",
    writable: true,
    configurable: true
  });
}

if (!URL.revokeObjectURL) {
  Object.defineProperty(URL, "revokeObjectURL", {
    value: () => {},
    writable: true,
    configurable: true
  });
}
