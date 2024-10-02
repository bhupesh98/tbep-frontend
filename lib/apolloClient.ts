import { ApolloClient,  InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:3000/graphql",
  cache: new InMemoryCache(),
  assumeImmutableResults: true,
  queryDeduplication: true,
});

export default client;