import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/instructor/courses")({
  component: InstructorCoursesLayout,
});

function InstructorCoursesLayout() {
  return (
    <Outlet />
  );
}
