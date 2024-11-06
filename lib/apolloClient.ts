import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/graphql`,
  cache: new InMemoryCache({
    addTypename: false,
  }),
  assumeImmutableResults: true,
});

export default client;
