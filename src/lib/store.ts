import { create } from "zustand";

interface SlideNavState {
  currentSlideIndex: number;
  totalSlides: number;
  setCurrentSlide: (index: number) => void;
  setTotalSlides: (total: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
}

export const useSlideNav = create<SlideNavState>((set, get) => ({
  currentSlideIndex: 0,
  totalSlides: 0,
  setCurrentSlide: (index) => set({ currentSlideIndex: index }),
  setTotalSlides: (total) => set({ totalSlides: total }),
  nextSlide: () => {
    const { currentSlideIndex, totalSlides } = get();
    if (currentSlideIndex < totalSlides - 1) {
      set({ currentSlideIndex: currentSlideIndex + 1 });
    }
  },
  prevSlide: () => {
    const { currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      set({ currentSlideIndex: currentSlideIndex - 1 });
    }
  },
}));
