import { describe, it, expect } from "vitest";
import { nominees } from "@/lib/domain/nominees";

const sub = (userId: string) => ({ userId });

describe("nominees", () => {
  const members = ["alex", "sam", "dana", "eli"];

  it("lists the members who submitted", () => {
    expect(nominees(members, [sub("alex"), sub("dana")])).toEqual(["alex", "dana"]);
  });

  it("is empty for an empty round", () => {
    expect(nominees(members, [])).toEqual([]);
  });

  it("lists a member once even with duplicate submissions", () => {
    expect(nominees(members, [sub("sam"), sub("sam"), sub("eli")])).toEqual(["sam", "eli"]);
  });

  it("follows member order, not submission order", () => {
    expect(nominees(members, [sub("eli"), sub("sam"), sub("alex")])).toEqual(["alex", "sam", "eli"]);
  });

  it("drops submitters who aren't members", () => {
    expect(nominees(members, [sub("stranger"), sub("dana")])).toEqual(["dana"]);
  });
});
