import React from "react";
import { useParams } from "react-router-dom";

import UserInfo from "./UserInfo";
import Card from "../../../shared/components/UIElements/Card";

const INITIAL_USERS = [
  {
    uId: "u1",
    name: "Marcel Nędza",
    avatar:
      "https://cdn.pixabay.com/photo/2019/12/12/16/27/dog-4691167_960_720.jpg",
    email: "test@test.com",
    recipes: 3,
  },
  {
    uId: "u2",
    name: "Jan Kowalski",
    avatar:
      "https://cdn.pixabay.com/photo/2014/08/23/11/33/cow-425164_960_720.jpg",
    email: "test2@test.com",
    recipes: 82,
  },
];

const User = () => {

  const userData = INITIAL_USERS;

  const usersId = useParams().userId;
  const correctProfile = userData.find((user) => user.uId === usersId);

  if (!correctProfile) {
    return (
      <Card>
        <h2>Could not find a user.</h2>
      </Card>
    );
  }

  return <UserInfo userData={correctProfile} />;
};

export default User;
