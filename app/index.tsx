import { Redirect, Stack } from 'expo-router';

import 'global.css';
import { Container } from '~/components/Container';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Container>
        <Redirect href={'/Home'} />
      </Container>
    </>
  );
}
