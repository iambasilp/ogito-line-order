const d = new Date("2026-06-01");
console.log("Original:", d.toISOString());
d.setHours(0, 0, 0, 0);
console.log("After setHours:", d.toISOString());
