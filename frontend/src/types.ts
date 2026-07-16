export interface Movie {
  tmdb_id: number;
  original_title: string;
  release_date: string;
  genres: string[];
  vote_average: number;
  vote_count: number;
  poster_url: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export type AuthStatus = "booting" | "authenticated" | "unauthenticated";

export type SortOption =
  | "default"
  | "title-asc"
  | "title-desc"
  | "year-desc"
  | "year-asc"
  | "rating-desc"
  | "votes-desc";

export interface MovieFilters {
  genres: string[];
  yearFrom: string;
  yearTo: string;
  ratingMin: number;
  sort: SortOption;
}

