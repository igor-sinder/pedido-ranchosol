document.addEventListener('DOMContentLoaded', () => {
    const productQuantities = document.querySelectorAll('.product-qty');
    const orderTableBody = document.querySelector('#order-table tbody');
    const orderGrandTotalElement = document.getElementById('order-grand-total');
    const noItemsRow = document.getElementById('no-items-row');
    const orderForm = document.getElementById('order-form'); // O formulário principal
    const triggerEmailSubmitBtn = document.getElementById('trigger-email-submit'); // Novo botão visível
    const sendWhatsappBtn = document.getElementById('send-whatsapp-btn'); // Botão de envio por WhatsApp
    const currentYearIndependentSpan = document.getElementById('current-year-independent');

    const orderItemsHiddenInput = document.getElementById('order-items-hidden');
    const orderTotalHiddenInput = document.getElementById('order-total-hidden');

    // Preencher o ano atual no rodapé
    if (currentYearIndependentSpan) {
        currentYearIndependentSpan.textContent = new Date().getFullYear();
    }

    const formatCurrency = (value) => {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };

    let globalSelectedProducts = []; // Armazenará os produtos selecionados e seus totais

    const updateOrderSummary = () => {
        let grandTotal = 0;
        globalSelectedProducts = []; // Limpa antes de preencher novamente
        orderTableBody.innerHTML = ''; // Limpa os itens de pedido atuais

        productQuantities.forEach(input => {
            const quantity = parseInt(input.value);
            if (quantity > 0) {
                const productName = input.dataset.productName;
                const unitPrice = parseFloat(input.dataset.unitPrice);
                const itemTotal = quantity * unitPrice;
                grandTotal += itemTotal;

                globalSelectedProducts.push({
                    name: productName,
                    unitPrice: unitPrice,
                    quantity: quantity,
                    itemTotal: itemTotal
                });

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${productName}</td>
                    <td>${formatCurrency(unitPrice)}</td>
                    <td>${quantity}</td>
                    <td>${formatCurrency(itemTotal)}</td>
                `;
                orderTableBody.appendChild(row);
            }
        });

        if (globalSelectedProducts.length === 0) {
            if (noItemsRow.parentNode !== orderTableBody) {
                orderTableBody.appendChild(noItemsRow);
            }
        } else {
            if (noItemsRow.parentNode === orderTableBody) {
                noItemsRow.remove();
            }
        }

        orderGrandTotalElement.textContent = formatCurrency(grandTotal);

        // Atualizar os campos ocultos para o Formspree
        orderItemsHiddenInput.value = JSON.stringify(globalSelectedProducts.map(item => ({
            Produto: item.name,
            'Valor Unitário': formatCurrency(item.unitPrice),
            Quantidade: item.quantity,
            'Valor Total Item': formatCurrency(item.itemTotal)
        })));
        orderTotalHiddenInput.value = formatCurrency(grandTotal);
    };

    // Adiciona event listeners para atualizar o resumo do pedido
    productQuantities.forEach(input => {
        input.addEventListener('change', updateOrderSummary);
        input.addEventListener('keyup', updateOrderSummary);
    });

    // Atualiza o resumo do pedido na carga inicial da página
    updateOrderSummary();

    // Funções de validação
    const validateForm = () => {
        let formIsValid = true;
        const requiredFields = [
            'client-name', 'client-doc', 'client-whatsapp', 'client-email',
            'client-responsible', 'client-street', 'client-number',
            'client-neighborhood', 'client-city', 'client-cep', 'payment-method'
        ];

        requiredFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (!input || input.value.trim() === '') {
                if (input) {
                    input.style.borderColor = 'red';
                }
                formIsValid = false;
            } else {
                if (input) {
                    input.style.borderColor = ''; // Resetar borda
                }
            }
        });

        if (!formIsValid) {
            alert('Por favor, preencha todos os campos obrigatórios do comprador antes de finalizar o pedido.');
            return false;
        }

        if (globalSelectedProducts.length === 0) {
            alert('Por favor, selecione pelo menos um produto para o pedido.');
            return false;
        }
        return true;
    };

    // Evento de clique no botão visível de EMAIL
    triggerEmailSubmitBtn.addEventListener('click', () => {
        if (!validateForm()) {
            return;
        }
        // Dispara o evento de submit do formulário real (o oculto)
        orderForm.submit();
    });

    // Evento de submissão do formulário para E-MAIL (Formspree)
    orderForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o envio padrão do formulário
        
        // A validação já ocorreu no clique do botão visível, mas pode ser repetida aqui por segurança
        if (!validateForm()) { // Este validateForm aqui seria redundante se o triggerEmailSubmitBtn sempre for usado
            return;
        }

        // Antes de submeter, garantimos que os campos ocultos estão atualizados
        updateOrderSummary(); // Chama de novo para garantir

        // Envia o formulário usando fetch (Formspree.io recomendado)
        try {
            const response = await fetch(orderForm.action, {
                method: orderForm.method,
                body: new FormData(orderForm),
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                alert('Pedido enviado com sucesso por e-mail! Em breve entraremos em contato para confirmar.');
                // Limpar o formulário SOMENTE após o envio por e-mail
                orderForm.reset();
                productQuantities.forEach(input => input.value = 0);
                updateOrderSummary();
            } else {
                const data = await response.json();
                if (data.errors) {
                    alert('Erro ao enviar o pedido por e-mail: ' + data.errors.map(err => err.message).join(', '));
                } else {
                    alert('Erro desconhecido ao enviar o pedido por e-mail.');
                }
            }
        } catch (error) {
            console.error('Erro na requisição Formspree:', error);
            alert('Não foi possível conectar ao serviço de e-mail. Por favor, verifique sua conexão ou tente novamente mais tarde.');
        }
    });

    // Evento de clique para o botão WHATSAPP
    sendWhatsappBtn.addEventListener('click', () => {
        if (!validateForm()) {
            return;
        }

        const clientWhatsappNumberInput = document.getElementById('client-whatsapp');
        const clientWhatsappNumber = clientWhatsappNumberInput.value.replace(/\D/g, ''); // Remove não-dígitos
        const mainContactNumber = '5522974027923'; // Número da Cachaça Rancho do Sol (seu número)

        // Coletar informações do cliente para o WhatsApp
        const clientName = document.getElementById('client-name').value.trim();
        const clientEmail = document.getElementById('client-email').value.trim();
        const clientDoc = document.getElementById('client-doc').value.trim();
        const paymentMethod = document.getElementById('payment-method').value.trim();

        let whatsappMessage = `Olá, sou ${clientName} (CPF/CNPJ: ${clientDoc}) e gostaria de fazer um pedido da Cachaça Rancho do Sol.\n\n`;
        whatsappMessage += `Minha forma de pagamento preferida é: ${paymentMethod}.\n\n`;

        whatsappMessage += `--- Itens do Pedido ---\n`;
        globalSelectedProducts.forEach(item => {
            whatsappMessage += `* ${item.name} | Quantidade: ${item.quantity} | Valor Unitário: ${formatCurrency(item.unitPrice)} | Total Item: ${formatCurrency(item.itemTotal)}\n`;
        });

        whatsappMessage += `\n--- Total do Pedido ---\n`;
        let currentGrandTotal = 0;
        globalSelectedProducts.forEach(item => currentGrandTotal += item.itemTotal);
        whatsappMessage += `* Valor Total da Venda: ${formatCurrency(currentGrandTotal)}\n\n`;

        whatsappMessage += `--- Dados para Contato e Entrega ---\n`;
        whatsappMessage += `* Nome/Razão Social: ${clientName}\n`;
        whatsappMessage += `* E-mail: ${clientEmail}\n`;
        whatsappMessage += `* WhatsApp Cliente: ${clientWhatsappNumberInput.value.trim()}\n`; // Usar o valor formatado
        if (document.getElementById('client-phone').value.trim()) {
            whatsappMessage += `* Telefone: ${document.getElementById('client-phone').value.trim()}\n`;
        }
        whatsappMessage += `* Rua: ${document.getElementById('client-street').value.trim()}, Número: ${document.getElementById('client-number').value.trim()}\n`;
        if (document.getElementById('client-complement').value.trim()) {
            whatsappMessage += `* Complemento: ${document.getElementById('client-complement').value.trim()}\n`;
        }
        whatsappMessage += `* Bairro: ${document.getElementById('client-neighborhood').value.trim()}\n`;
        whatsappMessage += `* Cidade: ${document.getElementById('client-city').value.trim()}\n`;
        whatsappMessage += `* CEP: ${document.getElementById('client-cep').value.trim()}\n`;
        if (document.getElementById('client-reference').value.trim()) {
            whatsappMessage += `* Ponto de Referência: ${document.getElementById('client-reference').value.trim()}\n`;
        }
        whatsappMessage += `\nAguardo seu contato para finalizar. Obrigado!`;

        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappUrl = `https://wa.me/${mainContactNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');

        alert('Seu pedido foi preparado para envio via WhatsApp. Por favor, confirme o envio na janela que se abriu. O formulário não foi limpo para sua conveniência.');
        // Formulário NÃO é limpo aqui
    });
});