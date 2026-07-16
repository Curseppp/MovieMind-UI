export async function responseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      detail?: string | Array<{ msg: string }>;
    };
    if (Array.isArray(payload.detail)) {
      return payload.detail.map((item) => item.msg).join(". ");
    }
    return payload.detail || "Неизвестная ошибка";
  } catch {
    return `Ошибка соединения (${response.status})`;
  }
}

export function translateError(message: string): string {
  const translations: Record<string, string> = {
    "Incorrect email or password": "Неверная почта или пароль.",
    "Refresh token is missing": "Сессия не найдена. Войдите снова.",
    "Invalid or expired refresh token": "Сессия завершена. Войдите снова.",
  };
  if (translations[message]) return translations[message];
  if (message.toLocaleLowerCase("ru").includes("already")) {
    return "Такая учётная запись уже существует.";
  }
  return message;
}

