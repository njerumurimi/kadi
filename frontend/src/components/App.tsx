import React from 'react';
import { GameContainer } from '.';
import { ReactNotifications } from 'react-notifications-component';

export const App = () => {
  return (
    <div className="App">
      <ReactNotifications />
      <GameContainer />
    </div>
  );
}
