import { Link } from "@tanstack/react-router";
import { BookOpen, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export interface CourseCardData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  level: string;
  is_free: boolean;
  price: number;
  category?: { name: string } | null;
}

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <Link to="/courses/$courseId" params={{ courseId: course.id }} className="group block">
      <Card className="h-full overflow-hidden border-border/50 bg-card transition-all hover:border-primary/50 hover:shadow-glow">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-primary">
              <BookOpen className="h-12 w-12 text-primary-foreground/80" />
            </div>
          )}
          <div className="absolute right-2 top-2">
            {course.is_free ? (
              <Badge className="bg-success text-success-foreground">Free</Badge>
            ) : (
              <Badge className="bg-gradient-primary text-primary-foreground">${course.price}</Badge>
            )}
          </div>
        </div>
        <CardHeader className="pb-2">
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-foreground group-hover:text-primary-glow">
            {course.title}
          </h3>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {course.description || "No description provided."}
          </p>
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {course.level}
          </span>
          {course.category && (
            <span className="inline-flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {course.category.name}
            </span>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
