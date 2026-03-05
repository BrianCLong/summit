export function dualTimestep(noise: number) {
 return {
   student_noise: noise,
   teacher_noise: noise * 0.5
 }
}
