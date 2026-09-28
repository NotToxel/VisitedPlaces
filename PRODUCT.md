# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People recording where they have travelled, planning future places, and comparing travel histories with friends.

## Product Purpose

VisitedPlaces is a private travel tracker. Fast place marking is the foundation; coverage analytics reward that work; share codes enable comparisons with others.

## Positioning

The tracker stores data in the browser without accounts or a server. Users choose when to export their data as a share code.

## Operating Context

Users mark countries and supported subregions on a map or in a directory, review analytics, and compare maps using pasted share codes. The core tracker should work offline; some subregion geography still requires a network request.

## Capabilities and Constraints

- Statuses: Visited, Wishlist, Avoid, Revisit, and unselected.
- A marked subregion can update its parent country's status.
- React, TypeScript, Zustand, React Router, and CSS are the existing stack.
- Country data is bundled. User data is persisted in localStorage.
- Preserve the map, list, analytics, comparison, About, and settings workflows.

## Brand Commitments

The product name is VisitedPlaces. The survey desk direction uses a cartographic palette, an editorial heading face, and precise controls. Light and dark themes have equal design priority. Status colours remain distinct and consistent across the map, directory, and analytics. The project guide prioritises privacy, offline use, code quality, and visual care.

## Evidence on Hand

The repository contains real country metadata and working tracker routes. It contains no customer testimonials or commercial claims.

## Product Principles

1. Make marking places quick and obvious.
2. Make coverage legible at a glance.
3. Keep sharing under the user's control.
4. Support the core tracker without a network connection.
