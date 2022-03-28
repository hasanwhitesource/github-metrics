export type PrNode = {
  createdAt: Date;
  number: number;
  author: {
    login: string;
  };
};
export type PullRequest = {
  number: number;
  participants: Participants;
};
export type Participants = {
  nodes: { databaseId: number }[];
};
export type Repository = {
  owner: string;
  name: string;
};
export type PageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
};
