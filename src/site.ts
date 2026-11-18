import type { Channel, ShellProfile } from "@adityavhlvy/design-system";

// The shell data mirrors the portfolio. It changes when the portfolio does,
// which is why the design system keeps the shape small.
export const profile: ShellProfile = {
  name: "Aditya Vahlevy Nugraha",
  quote: "Code like a turtle, vibe like a ninja.",
};

export const channels: Channel[] = [
  { name: "Email", handle: "adityavahlevy1003@gmail.com", href: "mailto:adityavahlevy1003@gmail.com", external: false },
  { name: "Phone", handle: "+62-822-9590-4985", href: "tel:+6282295904985", external: false },
  {
    name: "LinkedIn",
    handle: "@adityavahlevynugraha",
    href: "https://www.linkedin.com/in/adityavahlevynugraha",
    external: true,
  },
  { name: "GitHub", handle: "@adityavhlvy", href: "https://github.com/adityavhlvy/", external: true },
  {
    name: "GitLab",
    handle: "@adityavhlvy",
    href: "https://gitlabduo.pupuk-indonesia.com/adityavhlvy",
    external: true,
  },
  { name: "Instagram", handle: "@adityavhlvy", href: "https://instagram.com/adityavhlvy", external: true },
  {
    name: "Spotify",
    handle: "@xu97h5ah78wnivg1ra7etg2wu",
    href: "https://open.spotify.com/user/xu97h5ah78wnivg1ra7etg2wu",
    external: true,
  },
];
