import { interactiveUsers } from "./interactive-users";
import { Repository } from "./interactive-users/types";

const repo: Repository = {
  owner: "hasanwhitesource",
  name: "renovate-repro-gradle-wrapper",
};
const traget = "hasanwhitesource";

(async function () {
  try {
    const size = await interactiveUsers("token", repo, traget);
    console.log("----interactive users in the past 90 days----");
    console.log(`${size - 1} interactive users for ${traget}`);
  } catch (e) {
    console.error(e);
  }
})();
