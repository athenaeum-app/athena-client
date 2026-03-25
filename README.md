# Athena

A simple, fast, and intuitive library of moments. Acting as a personal mini-blog application, Athena focuses on capturing bite-sized and extensively filterable moments.

Athena is an app that stores moments (essentially formatted notes), into four layers:

- At the top is the Athenaeum, which contains all of a user's data.
- Then archives, which are like folders, splitting the user's data into seperate broad sections.
- Then moments, which are the individual "entries" of user data, like a short blog post.

The layers exist to allow for easy organization and filtering.

## What's a Moment?

A moment is like a post or formatted note. It consists of three main parts:

- **Title**: A short summary of the body.
- **Content**: A description of the moment. Could be anything! It's basically a message.
- **Tags**: This is where Athena shines. Tags are easily accessible and filterable, so use them!

Moments are assigned to the currently selected archive, or none.

## Core Features

- **Quick-access to Everything:** In Athena, the goal is to maintain a minimal UI, optimizing for the minimal amount of actions taken in order to do something.
- **Smart tags**: The tag bar is one of fastest ways to find what you are looking for. The tag list dynamically updates based on the current selection of tags, meaning that only tags that will actually yield displayed moments will show. Thus preventing experiences where pressing a tag will yield "No results found."
- **Link Previewing**: Whenever a link is detected in the content body, it will be displayed in a special format that uses scraped data to display it in a visually appealing way.

## Tech Stack

Athena is built using SolidJS and TailwindCSS with typescript for the frontend, vite for tooling, and electron forge for packaing and creating distributables.

## Locally Stored Data

Athena does not store data to any cloud services, and all data is stored locally, which backups being up to the user. Saving to the cloud will be added in future versions, and will be opt-in.
