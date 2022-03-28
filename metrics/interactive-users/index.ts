import { graphql } from "@octokit/graphql";
import "./types";
import { Repository, PullRequest, PrNode, PageInfo } from "./types";

async function participantsIdsOfPr(
  prNumber: number,
  repo: Repository,
  authToken: string
): Promise<Set<number>> {
  const { repository } = await graphql(
    `
    query participantsCount($owner: String!, $repo: String!, $num: Int = ${prNumber}) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $num) {
        participants(first: 10) {
          nodes{
            databaseId
          }
        }
      }
      }
    }
    `,
    {
      owner: repo.owner,
      repo: repo.name,
      headers: {
        authorization: `token ${authToken}`,
      },
    }
  );
  var pr: PullRequest = repository.pullRequest;
  var idSet = new Set<number>();
  pr.participants.nodes.forEach((p) => idSet.add(p.databaseId));
  return idSet;
}

async function prNumbers(
  startCursor: string | null,
  repo: Repository,
  targetUser: string,
  authToken: string
): Promise<PrNode[]> {
  //get all pr numbers that renovate created in the last 90 days
  var { repository } = await graphql(
    `
      query renovatePullRequests(
        $owner: String!
        $repo: String!
        $cursor: String
      ) {
        repository(owner: $owner, name: $repo) {
          pullRequests(first: 40, after: $cursor) {
            nodes {
              createdAt
              number
              author {
                login
              }
            }
          }
        }
      }
    `,
    {
      owner: repo.owner,
      repo: repo.name,
      cursor: startCursor,
      headers: {
        authorization: `token ${authToken}`,
      },
    }
  );
  const currentDate: Date = new Date();
  var filteredPrs: PrNode[] = repository.pullRequests.nodes;
  //filter by author date
  var numDaysBetween = function (date1: Date, date2: Date) {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return diffTime / (1000 * 3600 * 24);
  };
  const result = filteredPrs.filter((pr) => {
    return (
      pr.author.login === targetUser &&
      numDaysBetween(currentDate, new Date(pr.createdAt)) <= 90
    );
  });
  return result;
}

async function getPullRequests(
  cursor: string | null,
  repo: Repository,
  authToken: string
): Promise<PageInfo> {
  let { repository } = await graphql(
    `
      query pullRequests($owner: String!, $repo: String!, $cursor: String) {
        repository(owner: $owner, name: $repo) {
          pullRequests(first: 100, after: $cursor) {
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    `,
    {
      owner: repo.owner,
      repo: repo.name,
      cursor: cursor,
      headers: {
        authorization: `token ${authToken}`,
      },
    }
  );
  let res: PageInfo = repository.pullRequests.pageInfo;
  return res;
}

export async function interactiveUsers(
  authToken: string,
  repo: Repository,
  targetUser: string
): Promise<number> {
  var pageInfo: PageInfo = {
    endCursor: null,
    hasNextPage: true,
  };
  var idSet = new Set<number>();
  while (pageInfo.hasNextPage) {
    var targetPrs: PrNode[] = await prNumbers(
      pageInfo.endCursor,
      repo,
      targetUser,
      authToken
    );
    //for each target pr call participantsIdsOfPr and add to result
    for (let pr of targetPrs) {
      let res = await participantsIdsOfPr(pr.number, repo, authToken);
      res.forEach((v) => {
        idSet.add(v);
      });
    }
    pageInfo = await getPullRequests(pageInfo.endCursor, repo, authToken);
  }
  return idSet.size;
}
